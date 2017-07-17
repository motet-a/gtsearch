
import actions from './actions'
import store from './store'

const {WebSocket} = window

let eventsToSend = []

let ws

const connect = () => {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        throw new Error('WebSocket not closed')
    }

    ws = new WebSocket('ws://' + location.host + '/ws')

    ws.onopen = event => {
        ws.onmessage = event => {
            const data = JSON.parse(event.data)
            dispatchMessage(data.type, data.body)
        }
    }

    ws.onclose = ws.onerror = reconnect
}

let connectionTimeout
const reconnect = () => {
    ws.close()

    clearTimeout(connectionTimeout)
    connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CLOSED) {
            connect()
            return
        }

        reconnect()
    }, 1000)
}

connect()

const dispatchMessage = (type, body) => {
    switch (type) {
        case 'hello':
            setTimeout(() => {
                tryToSendEvents()
            }, 0)
            store.dispatch(actions.boostrap(body))
            return

        case 'repos':
            store.dispatch(actions.receiveRepos(body))
            return

        case 'repo':
            store.dispatch(actions.receiveRepo(body))
            return

        case 'repoError':
            if (body.type === 'notFound') {
                store.dispatch(actions.receiveRepoNotFound(body.name))
            }
            return

        case 'createRepo':
            store.dispatch(actions.receiveCreateRepo(body))
            return

        case 'createRepoError':
            store.dispatch(actions.receiveCreateRepoError(body))
            return

        case 'deleteRepo':
            store.dispatch(actions.receiveDeleteRepo(body))
            return

        case 'deleteRepoError':
            store.dispatch(actions.receiveDeleteRepoError(body))
            return

        case 'login':
            store.dispatch(actions.receiveLogin())
            return

        case 'loginError':
            store.dispatch(actions.receiveLoginError(body))
            return

        case 'searchResults':
            store.dispatch(actions.receiveSearchResults(body))
            return

        case 'searchEnd':
            store.dispatch(actions.receiveSearchEnd(body))
            return
    }

    throw new Error('Unknown ws event type: ' + event.data)
}

const tryToSendEvent = event => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event))
        eventsToSend = eventsToSend.filter(e => e !== event)
    }
}

const tryToSendEvents = () =>
    eventsToSend.forEach(tryToSendEvent)

export const send = event => {
    eventsToSend = [...eventsToSend, event]
    tryToSendEvents()
}
