import crypto from "crypto"

export default class Encryption {
	static generateKeyPair() {
		let key = crypto.generateKeyPairSync("rsa", {
			modulusLength: 2048,
			publicKeyEncoding: {
				type: "spki",
				format: "pem",
			},
			privateKeyEncoding: {
				type: "pkcs8",
				format: "pem",
			},
		})

		return {
			publicKey: key.publicKey,
			privateKey: key.privateKey,
		}
	}

	static encrypt(data, publicKey) {
		return crypto
			.publicEncrypt(
				{
					key: publicKey,
					padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
					oaepHash: "sha256",
				},
				Buffer.from(JSON.stringify(data))
			)
			.toString("base64")
	}

	static decrypt(data, privateKey) {
		return JSON.parse(
			crypto.privateDecrypt(
				{
					key: this.keys.privateKey,
					padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
					oaepHash: "sha256",
				},
				Buffer.from(data, "base64")
			)
		)
	}
}
