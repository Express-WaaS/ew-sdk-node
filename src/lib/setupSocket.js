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

            keySharingAlgorithm.send(
                _this,
                client_socket_id,
                _this.broadcast_keys,
                'client_broadcast_keys'
            )
        })
    },
    client: (_this, EWLogger) => {
        _this.broadcast_keys = keySharingAlgorithm.receive(
            _this,
            'client_broadcast_keys'
        )
    },
}
