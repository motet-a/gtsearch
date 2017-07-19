
const assert = require('assert')
const WebSocket = require('ws')

module.exports = class Client {
    constructor(websocket) {
        if (typeof websocket === 'string') {
            websocket = new WebSocket(websocket)
        }

        this._ws = websocket
        this._receivedMessages = []
        websocket.on('message', msg => {
            this._receivedMessages.push(JSON.parse(msg))
        })
    }

    async receive() {
        if (this._receivedMessages.length) {
            const msg = this._receivedMessages[0]
            this._receivedMessages.shift()
            return msg
        }

        return await new Promise(resolve => {
            this._ws.once('message', () => resolve(this.receive()))
        })
    }

    flushReceivedMessages() {
        this._receivedMessages = []
    }

    send(message) {
        this._ws.send(JSON.stringify(message))
    }

    terminate() {
        this._ws.terminate()
    }

    async isLoggedIn() {
        this.send({type: 'loggedIn'})

        const res = await this.receive()
        assert(res.type === 'loggedIn')
        return res.body
    }
}
