import crypto from 'crypto'

export default class Encryption {
    static generateKeyPair() {
        let key = crypto.generateKeyPairSync('rsa', {
            modulusLength: 1024,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        })

        return {
            publicKey: key.publicKey,
            privateKey: key.privateKey,
        }
    }

    static encrypt(data, publicKey, do_encryption) {
        data = JSON.stringify(data)
        const aes_keys = {
            key: crypto.randomBytes(16).toString('hex'),
            init: crypto.randomBytes(8).toString('hex'),
        }

        const cipherer = crypto.createCipheriv(
            'aes-256-cbc',
            aes_keys.key,
            aes_keys.init
        )

        if (!do_encryption) return data

        let encrypted = cipherer.update(data, 'utf8', 'base64')
        encrypted += cipherer.final('base64')

        const encrypted_aes_keys = crypto
            .publicEncrypt(publicKey, Buffer.from(JSON.stringify(aes_keys)))
            .toString('base64')

        return JSON.stringify({
            encrypted_aes_keys: encrypted_aes_keys,
            encrypted,
        })
    }

    static decrypt(data, privateKey, do_encryption) {
        data = JSON.parse(data)
        if (!do_encryption) return data

        const aes_keys = JSON.parse(
            crypto
                .privateDecrypt(
                    privateKey,
                    Buffer.from(data.encrypted_aes_keys, 'base64')
                )
                .toString('utf8')
        )

        const decipherer = crypto.createDecipheriv(
            'aes-256-cbc',
            aes_keys.key,
            aes_keys.init
        )

        let decrypted = decipherer.update(data.encrypted, 'base64', 'utf8')
        decrypted += decipherer.final('utf8')

        return JSON.parse(decrypted)
    }
}
