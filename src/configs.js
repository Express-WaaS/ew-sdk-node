let selector = 0
export default {
    log: true,
    ...[
        {
            ew_url: 'http://localhost:5000',
            httpOverWsTimeout: 10000,
        },
        {
            ew_url: 'http://localhost:5000',
            httpOverWsTimeout: 15000,
        },
    ][selector],
}
