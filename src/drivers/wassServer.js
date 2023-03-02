import io from "socket.io-client"
import crypto from "crypto"

export default class WaasServer {
	constructor(url) {
		this.url = url
		this.socket = null
		this.keys = {
			publicKey: null,
			privateKey: null,
		}
		return this
	}
	connect(namespace) {
		this.socket = new io(this.url, {
			query: {
				type: "SERVER",
				namespace,
				name: namespace,
			},
		})

		return this
	}

	onMessage(callback) {
		this.socket.on("message", (payload) => {
			callback(JSON.parse(this.decrypter(payload)))
		})
	}

	publish(topic, data) {
		if (data instanceof Object) data = JSON.stringify(data)

		data = this.encrypter(data)

		return this.socket.emit("publish", { topic, data })
	}

	registerTopic(topic) {
		return this.socket.emit("registerTopic", { topic, publicKey: null })
	}

	setKeys({ publicKey, privateKey }) {
		this.keys = { publicKey, privateKey }
		this.socket.emit("setKeys", { publicKey })
	}

	encrypter(data) {
		return crypto
			.publicEncrypt(
				{
					key: this.keys.publicKey,
					padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
					oaepHash: "sha256",
				},
				Buffer.from(JSON.stringify(data))
			)
			.toString("base64")
	}

	decrypter(data) {
		return crypto.privateDecrypt(
			{
				key: this.keys.privateKey,
				padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
				oaepHash: "sha256",
			},
			Buffer.from(data, "base64")
		)
	}
}
