import configs from '../configs.js'
import chalk from 'chalk'
import logger from './logger.js'

const HOWLogger = logger('HttpOverWs', chalk.blue)

export default io => ({
    request:
        for_id =>
        (path, ...params) => {
            path = path.split('__')
            let no_auto = path[1] === 'no_auto' ?? false
            path = path[0]

            if (!io && !io.connected)
                return new Error('HttpOverWs: No socket connection')

            let timeout = configs.httpOverWsTimeout

            let eventName = `request__${path}`
            if (for_id) {
                eventName += `__${for_id}`
            }
            if (no_auto) {
                eventName += '__no_auto'
            }

            HOWLogger.log({
                type: 'Request Emited',
                path,
                params,
                for_id,
            })

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('HttpOverWs: Request timeout'))
                }, timeout)

                const __ = (event, ...data) => {
                    if (event.startsWith('response__')) {
                        const _parts = event.split('__')
                        const _path = _parts[1]

                        if (_path === path) {
                            HOWLogger.log({
                                type: 'Response Received',
                                path,
                                params,
                                for_id,
                                data,
                                event,
                            })
                            resolve(...data)
                        }
                    }
                }

                io.offAny(__).onAny(__)

                io.emit(eventName, ...params)
            })
        },
    response: (path, callback) => {
        if (!io && !io.connected)
            return new Error('HttpOverWs: No socket connection')

        const __ = async (event, ...data) => {
            if (event.startsWith('request__')) {
                const _parts = event.split('__')
                const _path = _parts[1]
                if (_path === path) {
                    HOWLogger.log({
                        type: 'Request Received',
                        path,
                        data,
                    })

                    let response
                    let eventName = `response__${path}`
                    if (_parts[2]) {
                        response = await callback(_parts[2], ...data)
                        eventName += `__${_parts[2]}`
                    } else {
                        response = await callback(...data)
                    }
                    io.emit(eventName, response)
                    HOWLogger.log({
                        type: 'Response Emited',
                        path,
                        data: response,
                    })
                }
            }
        }

        io.offAny(__).onAny(__)
    },
})
