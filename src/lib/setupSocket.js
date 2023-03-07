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

        // error
        _this.socket.on('connect_error', error => {
            console.log(error)
            process.exit(1)
        })
    },

    server: (_this, EWLogger) => {
        _this.socket.on('new_client', async client_socket_id => {
            EWLogger.log({
                message: 'New Client Connected!',
                client_socket_id,
            })

            if (_this.do_encryption)
                keySharingAlgorithm.send(
                    _this,
                    client_socket_id,
                    _this.broadcast_keys,
                    'client_broadcast_keys'
                )
        })

        _this.socket.on('client_subscribe', async ({ client_id, topics }) => {
            EWLogger.log({
                message: 'client_subscribe',
                client_id,
                topics,
            })

            let key_set = []

            for (let i = 0; i < topics.length; i++) {
                const topic = _this.topics[topics[i]]
                if (!topic) throw new Error('Topic not found')
                key_set.push(topic)
            }

            if (_this.do_encryption)
                key_set.forEach(topic => {
                    keySharingAlgorithm.send(
                        _this,
                        client_id,
                        topic.keys,
                        'key_share:topic:' + topic.name
                    )
                })
        })
    },
    client: (_this, EWLogger) => {
        // for broadcast keys
        keySharingAlgorithm.receive(
            _this,
            _ => (_this.broadcast_keys = _),
            'client_broadcast_keys'
        )

        // for topic keys
        Object.keys(_this.topics).forEach(topic => {
            keySharingAlgorithm.receive(
                _this,
                _ => (_this.topics[topic] = _),
                'key_share:topic:' + topic
            )
        })
    },
}
