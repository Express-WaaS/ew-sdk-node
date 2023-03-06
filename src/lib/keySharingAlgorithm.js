import Encryption from './encryption.js'
import chalk from 'chalk'
import logger from './logger.js'

const KeySharerLogger = logger('KeySharer', chalk.magenta)

const send = async (_this, client_socket_id, keys, key_event_name) => {
    try {
        KeySharerLogger.log({
            message: `sending ${key_event_name} to client`,
            client_socket_id,
        })
        let pubClient
        do {
            pubClient = await _this.http.request()('client_public_key', {
                id: client_socket_id,
            })
            pubClient = JSON.parse(pubClient)
        } while (!pubClient.publicKey)

        const encryptedKeys = Encryption.encrypt(
            keys,
            pubClient.publicKey,
            _this.do_encryption
        )

        const sendKeys = await _this.http.request(client_socket_id)(
            key_event_name,
            { encryptedKeys }
        )

        KeySharerLogger.log({
            message: `sent ${key_event_name} to client`,
            client_socket_id,
        })
        return sendKeys
    } catch (e) {
        KeySharerLogger.error({
            message: `error sending ${key_event_name} to client`,
            error: e,
        })
    }
}

const receive = async (_this, setter, key_event_name) => {
    _this.http.response(key_event_name, async data => {
        data = data.encryptedKeys
        KeySharerLogger.log({
            message: `${key_event_name} : recieved`,
        })

        const decryptedKeys = Encryption.decrypt(
            data,
            _this.keys.privateKey,
            _this.do_encryption || true
        )

        KeySharerLogger.log({
            message: `${key_event_name} : did set`,
            decryptedKeys,
        })
        setter(decryptedKeys)
    })
}

export default {
    send,
    receive,
}
