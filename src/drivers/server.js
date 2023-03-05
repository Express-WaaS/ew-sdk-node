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
            }
        }

        this.topics = topicDetails

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

        this.http = httpOverWs(this.socket)

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

    async broadcast(data) {
        data = Encryption.encrypt(
            data,
            this.broadcast_keys.publicKey,
            this.do_encryption
        )
        await this.socket.emit('broadcast', data)
    }
}
