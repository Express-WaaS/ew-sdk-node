import io from "socket.io-client"

export default class WaasClient {
	constructor(url, { name }) {
		this.url = url
		this.socket = null
		this.name = name
		return this
	}
	connect(namespace) {
		this.socket = io(this.url + "/" + namespace, {
			query: {
				type: "CLIENT",
				name: this.name,
			},
		})
		return this
	}
	subscribe(topics) {
		return this.socket.emit("subscribe", topics)
	}
	onUpdate(topic, callback) {
		return this.socket.on("update", (payload) => {
			if (payload.topic === topic) {
				callback(payload.data)
			}
		})
	}
}
