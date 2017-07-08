const WebSocket = require('ws')
const assert = require('assert')
const V = require('@motet_a/validate')

const {consoleLogger} = require('./log')
const {repoSpec, isDbError, errors: dbErrors} = require('./db')
const {isClonesError, errors: clonesErrors} = require('./clones')
const {isValidGitUrl} = require('./util')

// Points to the logged in WebSocket or `null`
let _loggedInWs = null

const capitalize = string =>
    string.charAt(0).toUpperCase() + string.slice(1)

module.exports = ({wss, ws, req, db, clones, searches, log}) => {
    assert(wss && ws && req && db && clones && searches)

    log = log || consoleLogger

    const badMessageReceived = descr =>
        log.error('bad message received' + (descr ? ': ' + descr : ''))

    const send = (type, body) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({type, body}))
        }
    }

    const broadcast = (type, body) =>
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({type, body}))
            }
        })

    send('hello')

    const isLoggedIn = () =>
        _loggedInWs === ws

    const mustBeLoggedIn = errorMessageType => {
        if (!isLoggedIn()) {
            send(errorMessageType, {
                type: 'notLoggedIn',
            })
            throw 'NOT_LOGGED_IN'
        }
    }

    const handleLoggedIn = async msg => {
        send('loggedIn', isLoggedIn())
    }

    const getRepo = async name => {
        const repo = await db.getRepo(name)
        if (repo) {
            repo.beingFetched = clones.isBeingFetched(name)
        }
        return repo
    }

    const handleFetchRepo = async msg => {
        let name
        try {
            name = repoSpec.pick('name')(msg).name
        } catch (error) {
            send('fetchRepoError', {type: 'badRequest'})
            return
        }

        const repo = await getRepo(name)
        if (!repo) {
            send('repoError', {
                type: 'notFound',
                name,
            })
            return
        }

        send('repo', repo)
    }

    // Prefer `broadcastRepo`
    const broadcastRepoAsync = async name => {
        const repo = await getRepo(name)
        if (repo) {
            broadcast('repo', repo)
        }
    }

    // Sends a repo to every client.
    // Useful after a creation or an update.
    const broadcastRepo = name =>
        broadcastRepoAsync(name).catch(err => log.error(err))

    const handleDeleteRepo = async msg => {
        mustBeLoggedIn('deleteRepoError')

        const {name} = repoSpec.pick('name')(msg)
        await db.deleteRepo(name)
        await clones.remove(name)

        log.info('deleted ' + name)
        broadcast('deleteRepo', name)
    }

    const handleFetchRepos = async msg => {
        const repos = (await db.getRepos())
            .map(r => {
                r.beingFetched = clones.isBeingFetched(r.name)
                return r
            })

        send('repos', repos)
    }

    const handleLogin = async msg => {
        try {
            V.shape({
                plaintextPassword: V.string,
            })(msg)
        } catch (error) {
            send('loginError', {type: 'badRequest'})
            return
        }

        if (!await db.checkAdminPassword(msg.plaintextPassword)) {
            send('loginError', {type: 'badPassword'})
            return
        }

        _loggedInWs = ws
        send('login')
    }

    const handleLogout = async msg => {
        mustBeLoggedIn('logoutError')
        _loggedInWs = null
    }

    const cloneRepo = async ({url, name}) => {
        const onFetchStart = () => broadcastRepo(name)
        log.info('cloning ' + name + ' from ' + url)

        try {
            await clones.clone(url, name, {onFetchStart})
        } catch (error) {
            log.error(error)

            await db.setRepoFetchFailed(name, true)
            broadcastRepo(name)
            return
        }

        log.info('cloned ' + name)
        await db.setRepoFetchFailed(name, false)
        await db.setRepoCloned(name, true)
        broadcastRepo(name)
    }

    const handleCreateRepo = async msg => {
        mustBeLoggedIn('createRepoError')

        let repo
        try {
            repo = repoSpec.pick(
                'name', 'gitUrl', 'webUrl',
            )(msg)
        } catch (error) {
            send('createRepoError', {type: 'badRequest'})
            return
        }

        if (!isValidGitUrl(repo.gitUrl)) {
            send('createRepoError', {
                type: 'badGitUrl',
                gitUrl: repo.gitUrl,
            })
            return
        }

        try {
            await db.insertRepo(Object.assign(
                {
                    cloned: false,
                    fetchFailed: false,
                },
                repo,
            ))
        } catch (error) {
            if (isDbError(error) &&
                error.code === dbErrors.ALREADY_EXISTS) {
                send('createRepoError', {
                    type: 'nameAlreadyExists',
                    name: repo.name,
                })
                return
            }

            throw error
        }

        send('createRepo', repo.name)
        await cloneRepo({
            url: repo.gitUrl,
            name: repo.name,
        })
    }

    const pullRepo = async name => {
        const onFetchStart = () => broadcastRepo(name)
        log.info('pulling ' + name)

        try {
            await clones.pull(name, {onFetchStart})
        } catch (error) {
            log.error(error)

            await db.setRepoFetchFailed(name, true)
            broadcastRepo(name)
            return
        }

        log.info('pulled ' + name)
        await db.setRepoFetchFailed(name, false)
        broadcastRepo(name)
    }

    // TODO: Write tests
    const handlePullRepo = async msg => {
        mustBeLoggedIn('pullRepoError')

        let name
        try {
            name = repoSpec.pick('name')(msg).name
        } catch (error) {
            send('pullRepoError', {type: 'badRequest'})
            return
        }

        const repo = await getRepo(name)
        if (!repo) {
            send('pullRepoError', {type: 'noSuchRepo'})
            return
        }

        if (clones.isBeingFetched(name)) {
            send('pullRepoError', {type: 'beingFetched'})
        }

        if (repo.cloned) {
            await pullRepo(name)
            return
        }

        await cloneRepo({
            url: repo.gitUrl,
            name,
        })
    }

    let currentSearch

    const handleSearch = async msg => {
        let query
        try {
            query = V.shape({
                repoName: repoSpec.shape().name,
                query: V.string,
            })(msg)
        } catch (error) {
            send('searchError', {type: 'badRequest'})
            return
        }

        if (!await db.getRepo(query.repoName)) {
            send('searchError', {type: 'unknownRepoName'})
            return
        }

        if (!query.query) {
            return
        }

        if (currentSearch) {
            currentSearch.kill()
        }

        const search = searches.search({
            rootDirectory: clones.path(query.repoName),
            pattern: query.query,
            ignoreCase: true,
        })

        search.on('results', results => {
            if (!results.length) {
                return
            }

            send('searchResults', {
                repoName: query.repoName,
                query: query.query,
                results,
            })
            assert(!search.paused && !search.exited)
            search.pause()
        })

        search.on('stderr', error => {
            log.error('search error: ' + error)
        })

        search.on('exit', reason => {
            send('searchEnd', query)
            if (search === currentSearch) {
                currentSearch = null
            }
        })

        currentSearch = search
    }

    const handleSearchLoadMore = async msg => {
        if (currentSearch &&
            currentSearch.started &&
            currentSearch.paused) {
            currentSearch.resume()
        }
    }


    const handlers = {
        handleFetchRepo,
        handleFetchRepos,
        handleDeleteRepo,
        handlePullRepo,
        handleLogin,
        handleLogout,
        handleCreateRepo,
        handleLoggedIn,
        handleSearch,
        handleSearchLoadMore,
    }

    const handleMessage = async msg => {
        const handlerName = 'handle' + capitalize(msg.type)
        const handler = handlers[handlerName]
        if (handler) {
            try {
                return await handler(msg)
            } catch (error) {
                if (error === 'NOT_LOGGED_IN') {
                    return
                }

                throw error
            }
        }

        badMessageReceived(JSON.stringify(msg))
    }


    ws.on('message', string => {
        let msg
        try {
            msg = JSON.parse(string)
        } catch (error) {
            badMessageReceived(error.message)
            return
        }

        if (!msg || typeof msg.type !== 'string') {
            badMessageReceived('missing type')
            return
        }

        handleMessage(msg)
            .catch(error => log.error(error))
    })


    ws.on('close', () => {
        if (currentSearch) {
            currentSearch.kill()
        }
    })
}
