# Express WaaS SDK

## Getting Started

`npm i ew-sdk`

## Initiating your Server

```js
import { EWServer } from 'ew-sdk'

const server = new EWServer({
    encryption: 'AUTO' | 'NONE' | { publicKey: '', privateKey: '' },
    log: false | true,
    serverLocation: 'INDIA-CENTRAL',
})

server.connect(SERVER_TOKEN, [
    {
        name: "topic1",
    },
    ...
])

```

`server.connect()` is an async method. `SERVER_TOKEN` will be provided from the dashboard after adding your server. All the configuration will be fetched from cloud. You can use you RSA keypairs or use **AUTO** encryption mode for SDK to generate keypairs automatically.

## Server API

### 1. Custom Authentication

This is an event based custom authentication hook. You can access or use query section of [Client](#initiating-a-client) for custom authentication.

```js
server.customAuthentication(({ query, client_socket_id }) => {
    // some calculation
    // authentication code
    return true | false
})
```

### 2. Recieving messages from clients

This method can be used to [recieve messages](#5-send) from any clients.

```js
server.on_client_msg(data => {})
```

### 3. Broadcasting Data

```js
await server.broadcast(data)
```

### 4. Publishing to a topic

```js
await server.publish(topicName, data)
```

## Initiating a Client

```js
import { EWClient } from "ew-sdk"

const client = new EWClient({
	namespace: NAMESPACE,
	log: false | true,
	serverLocation: "INDIA-CENTRAL",
})

await client.connect({
    token: CLIENT_TOKEN,
    type: "ANONYMOUS",
    ref: "SERVER",
    topics: [
        {
            name: "topic1",
        },
        ...
    ],
    query:{
        ...
    }
})

```

You can use query section for any data to pass along with the connection request. It can also be used for custom authentication.

**Note: Client automatically syncs encryption settings with the server its connected to.**

## Client API

### 1. Subscribing to topics

```js
await client.subscribe(['Topic1', 'Topic2',...])
```

### 2. Unsubscribing to topics

```js
await client.unsubscribe(['Topic1', 'Topic2',...])
```

### 3. Recieving Updates

```js
client.on(topicName, (...publishedData) => {})
```

**Note: You can have multiple hooks on same topic!**

### 4. Recieving Broadcasted Updated

```js
client.onBroadcast((...broadcastedData) => {})
```

**Note: You can have multiple hooks.**

### 5. Send

```js
await client.send(data)
```

# `E2EE`

If E2EE is on, SDK will handle the encryption and decryption of data **automatically**.
