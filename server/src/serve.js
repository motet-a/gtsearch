
const accepts = require('accepts')
const zlib = require('zlib')
const {promisify} = require('util')
const WebSocket = require('ws')
const http = require('http')
const url = require('url')
const pathUtil = require('path')

const client = require('./client')
const handleWs = require('./ws')

// Returns a stream or `undefined` on error
const handleStaticRequest = (path, res) => {
    const stream = client.streamFile(pathUtil.join('dist', path))
    if (!stream) {
        res.statusCode = 404
        res.end('not found')
        return
    }

    const type = path.endsWith('.css') ? 'text/css' :
                 path.endsWith('.js') ? 'application/javascript' :
                 null

    if (type) {
        res.setHeader('Content-Type', type)
    }
    return stream
}

// Returns a stream or `undefined` on error
const handleRequest = (req, res) => {
    const {path} = url.parse(req.url, true)
    if (path.startsWith('/static/')) {
        return handleStaticRequest(path.slice('/static/'.length), res)
    }

    res.setHeader('Content-Type', 'text/html')
    return client.streamFile('index.html')
}

// Returns [name, stream] or null
const getCompressionStream = req => {
    switch (accepts(req).encoding(['gzip', 'deflate'])) {
        case 'gzip':
            return ['gzip', zlib.createGzip()]

        case 'deflate':
            return ['deflate', zlib.createDeflate()]
    }

    return null
}

const handleCompressedRequest = (req, res) => {
    let stream = handleRequest(req, res)
    if (!stream) {
        return
    }

    const compression = getCompressionStream(req)
    if (compression) {
        const [name, compressor] = compression
        res.setHeader('Content-Encoding', name)
        compressor.on('error', console.error)
        stream = stream.pipe(compressor)
    }

    stream.on('error', console.error)
    stream.pipe(res)
}

module.exports = async args => {
    const {address, port} = args
    const server = http.createServer(handleCompressedRequest)

    const wss = new WebSocket.Server({server})
    server.wss = wss

    wss.on('connection', (ws, req) =>
        handleWs(Object.assign({wss, ws, req}, args))
    )

    await promisify(server.listen.bind(server))(port, address)
    return server
}
