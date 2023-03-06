import io from 'socket.io-client'
import configs from '../configs.js'
import Encryption from '../lib/encryption.js'
import httpOverWs from '../lib/httpOverWs.js'
import logger from '../lib/logger.js'
import chalk from 'chalk'
import setupSocket from '../lib/setupSocket.js'

const EWLogger = logger('EWServer', chalk.green)

export default class EWClient {
    /**
     *
     * @returns {EWServer}
     */
    constructor({ namespace, encryption } = { namespace, encryption: 'NONE' }) {
        this.url = configs.ew_url + '/' + namespace

        this.socket = null

        this.cloudSettings = null

        this.http = null

        this.do_encryption = false

        this.topics = []

        this.broadcast_keys = {
            publicKey: null,
            privateKey: null,
        }

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

    /**
     *
     * @param {*} token
     * @param {*} token_type - ANONYMOUS, CLIENT
     * @param {*} ref - CLIENT | SERVER, null
     * @param {*} topicDetails - list of topics which are available to the client
     * @returns
     */
    async connect(token, token_type, ref, topicDetails) {
        if (topicDetails.length > 0) {
            for (let i = 0; i < topicDetails.length; i++) {
                topicDetails[i].keys = {
                    publicKey: null,
                    privateKey: null,
                }
            }
        }

        this.topics = topicDetails.reduce(
            (acc, topic) => ({ ...acc, [topic.name]: topic }),
            {}
        )

        let query = {
            keys: JSON.stringify({ pub: this.keys.publicKey }),
        }

        if (token_type === 'ANONYMOUS') {
            query.type = 'ANONYMOUS'
            if (!ref) throw new Error('ref is required for ANONYMOUS token')
            query.ref = ref
        } else {
            query.type = 'CLIENT'
        }

        this.socket = new io(this.url, {
            query,
            auth: {
                token: `CLIENT ${token}`,
            },
        })

        this.http = httpOverWs(this.socket)
        this.request = this.http.request()
        this.response = this.http.response

        setupSocket.basic(this, EWLogger)
        setupSocket.client(this, EWLogger)

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

    async subscribe(topics) {
        this.socket.emit('subscribe', topics)
    }

    async unsubscribe(topics) {
        this.socket.emit('unsubscribe', topics)
    }

    async __on(__path, __callback, __key) {
        this.socket.on(__path, __encryptedData => {
            const __decryptedData = Encryption.decrypt(
                __encryptedData.data,
                !!__key
                    ? __key()
                    : this.topics[__encryptedData.meta.topic].privateKey,
                this.do_encryption
            )

            __callback(__decryptedData)
        })
    }

    async on(topic, callback) {
        this.__on(`${topic}:update`, callback)
    }

    async onBroadcast(callback) {
        this.__on('broadcast', callback, () => this.broadcast_keys.privateKey)
    }
}
