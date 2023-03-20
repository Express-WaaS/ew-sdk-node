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
            console.log('SOCKET ERROR: ', error)
            // process.exit(1)
        })
    },

    server: (_this, EWLogger) => {
        _this.socket.on(
            'new_client',
            async ({ id: client_socket_id, query }) => {
                EWLogger.log({
                    message: 'New Client Connected!',
                    client_socket_id,
                    query,
                })

                // custom auths
                const authResult = await validator(_this, EWLogger, {
                    client_socket_id,
                    query,
                })
                if (!authResult.ok) {
                    _this.socket.emit('auth_error', {
                        client_socket_id,
                        message: authResult.message,
                    })
                    return
                }

                if (_this.do_encryption)
                    keySharingAlgorithm.send(
                        _this,
                        client_socket_id,
                        _this.broadcast_keys,
                        'client_broadcast_keys'
                    )
            }
        )

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

        _this.socket.on('change_topic_encryption', ({ topic, new_value }) => {
            _this.topics[topic].encryption = new_value
        })
    },
    client: (_this, EWLogger) => {
        // handling auth error
        _this.socket.on('auth_error', message => {
            EWLogger.error({
                message: 'Auth Error: ' + message,
            })
            process.exit(1)
        })

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

async function validator(_this, EWLogger, { query, client_socket_id }) {
    try {
        query = JSON.parse(query)
        EWLogger.log({
            message: 'custom_authentication',
            query,
            client_socket_id,
        })
        const res = await Promise.allSettled(
            _this.custom_auths_hooks.map(
                async hook => await hook({ query, client_socket_id })
            )
        )
        for (let _res of res) {
            console.log('reSS:', _res)
            if (!_res.status === 'fulfilled')
                throw new Error(_res?.reason ?? 'Custom Authentication Failed')
            _res = _res.value
            if (!_res.ok) throw new Error(_res.message)
        }
        return {
            ok: true,
            message: 'Auth OK',
        }
    } catch (error) {
        console.log(error)
        return {
            ok: false,
            message: error.message,
        }
    }
}
