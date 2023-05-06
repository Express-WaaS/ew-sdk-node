export default socket =>
    new Promise(resolve => {
        socket.once('connect_done', () => {
            resolve()
        })
    })
