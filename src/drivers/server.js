import io from "socket.io-client"
import configs from "../configs.js"
import Encryption from "../lib/encryption.js"

export default class EWServer {
	/**
	 *
	 * @returns {EWServer}
	 */
	constructor({ encryption } = { encryption: "NONE" }) {
		this.url = configs.ew_url

		this.socket = null

		// encryption modes - AUTO, NONE, {publicKey, privateKey}
		if (encryption === "NONE") {
			this.encryption = null
			this.keys = {
				publicKey: null,
				privateKey: null,
			}
		} else if (encryption === "AUTO") {
			this.keys = Encryption.generateKeyPair()
		} else {
			this.keys = encryption
		}

		return this
	}

	connect(token) {
		this.socket = new io(this.url, {
			query: {
				type: "SERVER",
				keys: JSON.stringify({ pub: this.keys.publicKey }),
			},
			auth: {
				token: `SERVER ${token}`,
			},
		})
		return this
	}
}
