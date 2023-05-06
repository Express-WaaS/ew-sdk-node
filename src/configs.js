let selector = 2
export default {
    log: () => (process.env.EW_LOG ?? 'true') !== 'false',
    servers: {
        'US-EAST': 'http://20.102.125.139',
        'INDIA-CENTRAL': 'http://20.219.15.210',
    },
    ...[
        {
            ew_url: 'http://localhost:5000',
            httpOverWsTimeout: 10000,
            ping_interval: 1000,
        },
        {
            ew_url: 'http://localhost',
            httpOverWsTimeout: 10000,
            ping_interval: 1000,
        },
        {
            ew_url: 'http://20.102.125.139',
            httpOverWsTimeout: 10000,
            ping_interval: 1000,
        },
    ][selector],
}
