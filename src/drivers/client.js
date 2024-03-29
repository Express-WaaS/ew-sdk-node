import io from 'socket.io-client'
import configs from '../configs.js'
import Encryption from '../lib/encryption.js'
import httpOverWs from '../lib/httpOverWs.js'
import logger from '../lib/logger.js'
import chalk from 'chalk'
import setupSocket from '../lib/setupSocket.js'
import waitForConnection from '../lib/waitForConnection.js'

const EWLogger = logger('EWServer', chalk.green)

export default class EWClient {
    /**
     *
     * @returns {EWServer}
     */
    constructor(
        { namespace, log, serverLocation } = {
            namespace,
            log: false,
            serverLocation: 'INDIA-CENTRAL',
        }
    ) {
        this.url = configs.ew_url + '/' + namespace

        this.socket = null

        this.cloudSettings = null

        this.http = null

        this.do_encryption = false

        this.topics = []

        this.type = ''

        this.broadcast_keys = {
            publicKey: null,
            privateKey: null,
        }

        this.serverLocation =
            Object.keys(configs.servers).indexOf(serverLocation) > -1
                ? serverLocation
                : 'INDIA_CENTRAL'

        // configs.servers[this.serverLocation]
        this.url = configs.servers[this.serverLocation] + '/' + namespace

        // console.log(this.url)

        if (!log) {
            process.env.EW_LOG = false
        }

        // encryption modes - AUTO, NONE, {publicKey, privateKey}
        // if (encryption === 'NONE') {
        //     this.encryption = null
        //     this.keys = {
        //         publicKey: null,
        //         privateKey: null,
        //     }
        // } else if (encryption === 'AUTO') {
        //     this.keys = Encryption.generateKeyPair()
        // } else {
        //     this.keys = encryption
        // }
        this.keys = Encryption.generateKeyPair()

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
    async connect({
        token,
        type: token_type,
        ref,
        topics: topicDetails,
        query: customQueries = {},
    }) {
        if (typeof customQueries !== 'object')
            throw new Error('query must be an object')

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

        this.type = query.type

        this.socket = new io(this.url, {
            query: {
                ...query,
                customQueries: JSON.stringify(customQueries),
            },
            auth: {
                token: `CLIENT ${token}`,
            },
        })

        await waitForConnection(this.socket)

        this.http = httpOverWs(this.socket)
        this.request = this.http.request()
        this.response = this.http.response

        setupSocket.basic(this, EWLogger)
        setupSocket.client(this, EWLogger)

        await this.syncCloudSettings()

        return this
    }

    async syncCloudSettings() {
        EWLogger.log({
            message: 'fetching cloud settings...',
        })
        while (!this.cloudSettings) {
            try {
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
                    message: 'error fetching cloud settings, retrying in 5s',
                    error,
                })
                await new Promise(resolve => setTimeout(resolve, 5000))
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
                __encryptedData.meta.encrypted
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

    async send(data) {
        try {
            // check if data is an object
            if (typeof data !== 'object') {
                throw new Error('data must be an object')
            }

            // check if data is empty
            if (Object.keys(data).length === 0) {
                throw new Error('data cannot be empty')
            }

            const server_key_details = JSON.parse(
                await this.http.request()('server_public_key__no_auto')
            )

            // encrypt data with topic keys
            data = Encryption.encrypt(
                data,
                server_key_details.publicKey,
                server_key_details.encryption
            )

            // publish data
            this.socket.emit('CLIENT_MSG', {
                encrypted: server_key_details.encryption,
                data,
            })
        } catch (error) {
            EWLogger.error({
                message: 'error publishing',
                error,
            })
        }
    }
}
