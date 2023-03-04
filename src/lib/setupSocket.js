import Encryption from './encryption.js'

export default {
    basic: (_this, EWLogger) => {
        _this.socket.onAny((event, ...data) => {
            console.log('new event', event, data)
        })

        _this.socket.on('update_cloud_settings', data => {
            EWLogger.log({
                message: 'updating cloud settings',
                data,
            })
            _this.cloudSettings = data
        })
    },

    server: (_this, EWLogger) => {
        _this.socket.on('new_client', async client_socket_id => {
            EWLogger.log({
                message: 'New Client Connected!',
                client_socket_id,
            })

            try {
                let pubClient = await _this.http.request()(
                    'client_public_key',
                    {
                        id: client_socket_id,
                    }
                )
                pubClient = JSON.parse(pubClient)

                const encryptedBroadcastKeys = Encryption.encrypt(
                    _this.broadcast_keys,
                    pubClient.publicKey,
                    _this.do_encryption
                )
                const sendBroadcastKeys = await _this.http.request(
                    client_socket_id
                )('client_broadcast_keys', { encryptedBroadcastKeys })

                return sendBroadcastKeys
            } catch (e) {
                EWLogger.error({
                    message: 'error sending broadcast keys to client',
                    error: e,
                })
            }
        })
    },
    client: (_this, EWLogger) => {
        _this.socket.on('set_broadcast_keys', async data => {
            EWLogger.log({
                message: 'set_broadcast_keys',
            })
            const decryptedBroadcastKeys = Encryption.decrypt(
                data.encryptedBroadcastKeys,
                _this.keys.privateKey,
                _this.do_encryption || true
            )

            _this.broadcastKeys = decryptedBroadcastKeys

            EWLogger.log({
                message: 'set_broadcast_keys',
                decryptedBroadcastKeys,
            })
        })
    },
}
