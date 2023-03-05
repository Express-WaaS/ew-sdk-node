import Encryption from './encryption.js'
import keySharingAlgorithm from './keySharingAlgorithm.js'

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

            keySharingAlgorithm(
                _this,
                client_socket_id,
                _this.broadcast_keys,
                'client_broadcast_keys'
            )
        })
    },
    client: (_this, EWLogger) => {
        _this.http.response('client_broadcast_keys', async data => {
            data = data.encryptedKeys
            EWLogger.log({
                message: 'client_broadcast_keys : set Broadcast Keys',
            })

            const decryptedBroadcastKeys = Encryption.decrypt(
                data,
                _this.keys.privateKey,
                _this.do_encryption || true
            )

            _this.broadcast_keys = decryptedBroadcastKeys

            EWLogger.log({
                message: 'client_broadcast_keys : did set Broadcast Keys',
                decryptedBroadcastKeys,
            })
            return true
        })
    },
}
