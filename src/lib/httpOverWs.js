import configs from '../configs.js'
import chalk from 'chalk'
import logger from './logger.js'

const HOWLogger = logger('HttpOverWs', chalk.blue)

export default io => ({
    request:
        for_id =>
        (path, ...params) => {
            if (!io && !io.connected)
                return new Error('HttpOverWs: No socket connection')

            let timeout = configs.httpOverWsTimeout

            let eventName = `request__${path}`
            if (for_id) {
                eventName += `__${for_id}`
            }

            io.emit(eventName, ...params)

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

                io.onAny((event, ...data) => {
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
                            })
                            resolve(...data)
                        }
                    }
                })
            })
        },
    response: (path, callback) => {
        if (!io && !io.connected)
            return new Error('HttpOverWs: No socket connection')

        io.onAny(async (event, ...data) => {
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
        })
    },
})
