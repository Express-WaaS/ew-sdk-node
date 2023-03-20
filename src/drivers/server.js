import io from 'socket.io-client'
import configs from '../configs.js'
import Encryption from '../lib/encryption.js'
import httpOverWs from '../lib/httpOverWs.js'
import logger from '../lib/logger.js'
import chalk from 'chalk'
import setupSocket from '../lib/setupSocket.js'

const EWLogger = logger('EWServer', chalk.green)

export default class EWServer {
    /**
     *
     * @returns {EWServer}
     */
    constructor({ encryption } = { encryption: 'NONE' }) {
        this.url = configs.ew_url

        this.socket = null

        this.topics = []

        this.broadcast_keys = Encryption.generateKeyPair()

        this.cloudSettings = null

        this.http = null

        this.do_encryption = false

        this.custom_auths_hooks = []

        // encryption modes - AUTO, NONE, {publicKey, privateKey}
        if (encryption === 'NONE') {
            this.encryption = null
            this.keys = {
                publicKey: null,
                privateKey: null,
            }
        } else if (encryption === 'AUTO') {
            this.keys = Encryption.generateKeyPair()
        } else {
            this.keys = encryption
        }

        return this
    }

    async connect(token, topicDetails) {
        EWLogger.log({
            message: 'connecting to server',
        })
        if (topicDetails.length > 0) {
            for (let i = 0; i < topicDetails.length; i++) {
                topicDetails[i].keys = Encryption.generateKeyPair()
                topicDetails[i].encryption = false
            }
        }

        this.topics = topicDetails.reduce(
            (acc, topic) => ({ ...acc, [topic.name]: topic }),
            {}
        )

        this.socket = new io(this.url, {
            query: {
                type: 'SERVER',
                keys: JSON.stringify({ pub: this.keys.publicKey }),
                topics: JSON.stringify(
                    topicDetails.map(topic => ({
                        name: topic.name,
                        keys: { publicKey: topic.keys.publicKey },
                    }))
                ),
                broadcast_keys: JSON.stringify({
                    publicKey: this.broadcast_keys.publicKey,
                }),
            },
            auth: {
                token: `SERVER ${token}`,
            },
        })

        this.http = httpOverWs(this.socket, this)
        this.request = this.http.request()
        this.response = this.http.response

        setupSocket.basic(this, EWLogger)
        setupSocket.server(this, EWLogger)

        await this.syncCloudSettings()

        return this
    }

    async syncCloudSettings() {
        while (!this.cloudSettings) {
            try {
                EWLogger.log({
                    message: 'fetching cloud settings',
                })

                this.cloudSettings = await this.http.request()(
                    'cloud_settings__no_auto'
                )

                this.do_encryption = this.cloudSettings.options.encryption

                for (const _keys in this.topics) {
                    this.topics[_keys].encryption = this.do_encryption
                }

                EWLogger.log({
                    message: 'cloud settings fetched',
                    cloudSettings: this.cloudSettings,
                })
            } catch (error) {
                EWLogger.error({
                    message: 'error fetching cloud settings',
                    error,
                })
                EWLogger.log({
                    message: 'retrying...',
                })
            }
        }
    }

    /**
     * @callback customAuthHook
     * @param {Object} data query, details, client_socket_id
     * @returns {Object} {ok: boolean, message: string}
     */
    /**
     *
     * @param {customAuthHook} hook authenticator function
     */
    async customAuthentication(hook) {
        this.custom_auths_hooks.push(hook)
    }

    async __send_event(
        eventName,
        publicKey,
        topic,
        data,
        is_broadcast = false
    ) {
        try {
            // check if topic exists
            if (!is_broadcast && !this.topics[topic]) {
                throw new Error(`topic ${topic} does not exist`)
            }

            // check if data is an object
            if (typeof data !== 'object') {
                throw new Error('data must be an object')
            }

            // check if data is empty
            if (Object.keys(data).length === 0) {
                throw new Error('data cannot be empty')
            }

            // encrypt data with topic keys
            data = Encryption.encrypt(
                data,
                publicKey,
                this.topics[topic].encryption
            )

            // publish data
            this.socket.emit(eventName, {
                topic,
                encrypted: this.topics[topic].encryption,
                data,
            })
        } catch (error) {
            EWLogger.error({
                message: 'error publishing',
                error,
            })
        }
    }

    async publish(topic, data) {
        await this.__send_event(
            'publish',
            this.topics[topic].keys.publicKey,
            topic,
            data
        )
    }

    async broadcast(data) {
        await this.__send_event(
            'broadcast',
            this.broadcast_keys.publicKey,
            'broadcast',
            data,
            true
        )
    }

    async getClientPublicKey(client_id) {
        let pubClient
        do {
            pubClient = await _this.http.request()('client_public_key', {
                id: client_id,
            })
            pubClient = JSON.parse(pubClient)
        } while (!pubClient.publicKey)
        return pubClient.publicKey
    }
}
