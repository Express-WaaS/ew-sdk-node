import io from "socket.io-client"
import configs from "../configs.js"
import Encryption from "../lib/encryption.js"

export default class EWClient {
	/**
	 *
	 * @returns {EWServer}
	 */
	constructor({ namespace, encryption } = { namespace, encryption: "NONE" }) {
		this.url = configs.ew_url + "/" + namespace

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

	/**
	 *
	 * @param {*} token
	 * @param {*} token_type - ANONYMOUS, CLIENT
	 * @param {*} ref - CLIENT | SERVER, null
	 * @returns
	 */
	connect(token, token_type, ref) {
		let query = {
			keys: JSON.stringify({ pub: this.keys.publicKey }),
		}

		if (token_type === "ANONYMOUS") {
			query.type = "ANONYMOUS"
			if (!ref) throw new Error("ref is required for ANONYMOUS token")
			query.ref = ref
		} else {
			query.type = "CLIENT"
		}

		this.socket = new io(this.url, {
			query,
			auth: {
				token: `CLIENT ${token}`,
			},
		})
		return this
	}
}
