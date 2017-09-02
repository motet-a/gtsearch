const WebSocket = require('ws')
const assert = require('assert')
const V = require('@motet_a/validate')

const {repoSpec, isDbError, errors: dbErrors} = require('./db')
const {isClonesError, errors: clonesErrors} = require('./clones')
const {isValidGitUrl} = require('./util')

// Points to the logged in WebSocket or `null`
let _loggedInWs = null

const capitalize = string =>
    string.charAt(0).toUpperCase() + string.slice(1)

module.exports = ({wss, ws, req, db, clones, searches, pullCron, log}) => {
    assert(wss && ws && req && db && clones && searches && pullCron && log)

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
            repo.beingPulled = clones.isBeingPulled(name)
        }
        return repo
    }

    const handleFetchRepo = async msg => {
        let name
        try {
            name = repoSpec.pick('name')(msg).name
        } catch (error) {
            send('pullRepoError', {type: 'badRequest'})
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
        broadcastRepoAsync(name)
            .catch(err => log.error('broadcastRepo error:', err))

    const handleDeleteRepo = async msg => {
        mustBeLoggedIn('deleteRepoError')

        const {name} = repoSpec.pick('name')(msg)
        await db.deleteRepo(name)
        await clones.remove(name)

        log.info('deleted repo ' + name)
        broadcast('deleteRepo', name)
    }

    const handleFetchRepos = async msg => {
        const repos = (await db.getRepos())
            .map(r => {
                r.beingPulled = clones.isBeingPulled(r.name)
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
        log.info('cloning ' + name + ' from ' + url)

        try {
            await clones.clone(url, name)
        } catch (error) {
            log.error('cloneRepo error:', error)

            await db.setRepoPullFailed(name, true)
            return
        }

        log.info('cloned ' + name)

        const branch = await clones.getCurrentBranch(name)

        await db.setRepoPullFailed(name, false)
        await db.setRepoCloned(name, true)
        await db.setRepoBranch(name, branch)

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
                    pullFailed: false,
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

        if (currentSearch) {
            currentSearch.kill()
        }

        if (!query.query) {
            return
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
            log.error('search error:', error)
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
            .catch(error => {
                log.error('message handler error:', error)
            })
    })



    // This function is called when the `beingPulled` property
    // of a repo has changed.
    const clonesPullListener = ({repoName}) =>
        broadcastRepo(repoName)

    clones.on('pullStart', clonesPullListener)
    clones.on('pullEnd', clonesPullListener)

    ws.on('close', () => {
        if (currentSearch) {
            currentSearch.kill()
        }

        clones.removeListener('pullStart', clonesPullListener)
        clones.removeListener('pullEnd', clonesPullListener)
    })
}
