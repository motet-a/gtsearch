
const {assert} = require('chai')
const WebSocket = require('ws')
const {promisify} = require('util')
const EventEmitter = require('events')

const createSearches = require('./searches')
const {dummyLogger} = require('./log')
const createDb = require('./db')
const createClones = require('./clones')
const serve = require('./serve')


class Client {
    constructor(websocket) {
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


const fixtures = {
    ws: {
        name: 'ws',
        gitUrl: 'https://github.com/websockets/ws.git',
        webUrl: '',
        cloned: false,
        fetchFailed: false,
    },

    yan: {
        name: 'yan',
        gitUrl: 'https://github.com/motet-a/yan.git',
        webUrl: '',
        cloned: false,
        fetchFailed: false,
    },
}


describe('ws', () => {
    let db
    let clones
    let searches
    let server
    let adminPassword

    let admin
    let user

    const address = 'localhost'
    const port = 8081

    const createClient = () =>
        new Client(new WebSocket('ws://' + address + ':' + port))

    before(async () => {
        assert(!server)
        db = await createDb('test')
        await db._db.truncateTables()
        await db.setupAdmin()
        adminPassword = await db.resetAdminPassword()
        clones = createClones('test-clones')
        searches = createSearches()

        server = await serve({
            db, clones, searches,
            address, port,
            log: dummyLogger,
        })

        admin = createClient()
        user = createClient()

        // Wait for the `hello` message from the server to make sure
        // the websockets are opened
        await admin.receive()
        await user.receive()
    })

    after(async () => {
        server.close()
    })

    beforeEach(async () => {
        admin.flushReceivedMessages()

        admin.send({
            type: 'login',
            plaintextPassword: adminPassword,
        })

        assert.deepEqual(
            await admin.receive(),
            {type: 'login'},
        )

        admin.flushReceivedMessages()
        user.flushReceivedMessages()

        assert(await admin.isLoggedIn())

        await db._db.run('DELETE FROM `repos`;')
        await db.insertRepo(fixtures.ws)
    })



    it('sends `hello` on connection', async () => {
        const client = createClient()

        assert.deepEqual(
            await client.receive(),
            {type: 'hello'},
        )

        client.terminate()
    })



    describe('login', () => {
        it('fails if the request is invalid', async () => {
            user.send({type: 'login'})

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'loginError',
                    body: {
                        type: 'badRequest',
                    },
                },
            )
        })

        it('fails with a bad password', async () => {
            assert(!await user.isLoggedIn())

            user.send({
                type: 'login',
                plaintextPassword: 'badPassword',
            })

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'loginError',
                    body: {type: 'badPassword'}
                },
            )
        })

        it('works', async () => {
            assert(!await user.isLoggedIn())
            assert(await admin.isLoggedIn())

            user.send({
                type: 'login',
                plaintextPassword: adminPassword,
            })

            assert.deepEqual(
                await user.receive(),
                {type: 'login'},
            )

            assert(await user.isLoggedIn())
            assert(!await admin.isLoggedIn())

            user.send({
                type: 'logout'
            })

            assert(!await user.isLoggedIn())
        })
    })

    describe('createRepo', () => {
        it('fails if the user is not logged in', async () => {
            user.send({type: 'createRepo'})

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'createRepoError',
                    body: {type: 'notLoggedIn'},
                },
            )
        })

        it('fails if the request is invalid', async () => {
            admin.send({
                type: 'createRepo',
                name: '',
                gitUrl: 'https://github.com/motet-a/yan.git',
                webUrl: '',
            })

            assert.deepEqual(
                await admin.receive(),
                {
                    type: 'createRepoError',
                    body: {
                        type: 'badRequest',
                    },
                },
            )

            admin.send({
                type: 'createRepo',
                name: 'yan',
                gitUrl: 'badurl',
                webUrl: '',
            })

            assert.deepEqual(
                await admin.receive(),
                {
                    type: 'createRepoError',
                    body: {
                        gitUrl: 'badurl',
                        type: 'badGitUrl',
                    },
                },
            )
        })

        it('fails if a similarly named repository already exists', async () => {
            admin.send(Object.assign(
                {type: 'createRepo'},
                fixtures.ws,
            ))

            assert.deepEqual(
                await admin.receive(),
                {
                    type: 'createRepoError',
                    body: {
                        type: 'nameAlreadyExists',
                        name: 'ws',
                    },
                }
            )
        })

        it('works', async () => {
            admin.send({
                type: 'createRepo',
                name: 'yan',
                gitUrl: fixtures.yan.gitUrl,
                webUrl: '',
            })

            assert.deepEqual(
                await admin.receive(),
                {
                    type: 'createRepo',
                    body: 'yan',
                },
            )

            const beingCloned = {
                type: 'repo',
                body: Object.assign(
                    {beingFetched: true},
                    fixtures.yan,
                ),
            }

            assert.deepEqual(
                await admin.receive(),
                beingCloned,
            )

            assert.deepEqual(
                await user.receive(),
                beingCloned,
            )

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'repo',
                    body: Object.assign(
                        {},
                        fixtures.yan,
                        {cloned: true, beingFetched: false},
                    ),
                },
            )
        }).timeout(10 * 1000)
    })

    describe('fetchRepo', () => {
        it('fails with an non-existent repo', async () => {
            user.send({
                type: 'fetchRepo',
                name: 'unknown',
            })

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'repoError',
                    body: {
                        name: 'unknown',
                        type: 'notFound',
                    },
                },
            )
        })

        it('works', async () => {
            user.send({
                type: 'fetchRepo',
                name: fixtures.ws.name,
            })

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'repo',
                    body: Object.assign(
                        {beingFetched: false},
                        fixtures.ws,
                    ),
                },
            )
        })
    })

    describe('fetchRepos', () => {
        it('works', async () => {
            user.send({
                type: 'fetchRepos',
            })

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'repos',
                    body: [
                        Object.assign(
                            {beingFetched: false},
                            fixtures.ws,
                        )
                    ],
                },
            )
        })
    })

    describe('deleteRepo', () => {
        it('fails if the user is not logged in', async () => {
            user.send({type: 'deleteRepo'})

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'deleteRepoError',
                    body: {type: 'notLoggedIn'},
                },
            )
        })

        it('works', async () => {
            admin.send({type: 'deleteRepo', name: 'ws'})

            assert.deepEqual(
                await admin.receive(),
                {
                    type: 'deleteRepo',
                    body: 'ws',
                },
            )

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'deleteRepo',
                    body: 'ws',
                },
            )

            user.send({
                type: 'fetchRepos',
            })

            assert.deepEqual(
                await user.receive(),
                {
                    type: 'repos',
                    body: [],
                },
            )
        })
    })
})
