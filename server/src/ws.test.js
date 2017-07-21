
const assert = require('assert')
const {promisify} = require('util')
const EventEmitter = require('events')

const Client = require('./ws-test-client')
const createTestServer = require('./create-test-server')
const serve = require('./serve')
const fixtures = require('./test-fixtures')
const {repoEqual, wait} = require('./util')

describe('ws', () => {
    let serverConfig
    let db
    let adminPassword

    let admin
    let user

    const createClient = () =>
        new Client('ws://' + serverConfig.address + ':' + serverConfig.port)

    before(async function () {
        this.timeout(5 * 1000)

        assert(!serverConfig)
        serverConfig = await createTestServer()
        db = serverConfig.db
        adminPassword = serverConfig.adminPassword

        admin = createClient()
        user = createClient()

        // Wait for the `hello` message from the server to make sure
        // the websockets are opened
        await admin.receive()
        await user.receive()
    })

    after(() => {
        serverConfig.server.close()
    })

    beforeEach(async () => {
        admin.flushReceivedMessages()

        admin.send({
            type: 'login',
            plaintextPassword: adminPassword,
        })

        assert.deepStrictEqual(
            await admin.receive(),
            {type: 'login'},
        )

        admin.flushReceivedMessages()
        user.flushReceivedMessages()

        assert(await admin.isLoggedIn())

        await db._db.run('DELETE FROM `repos`;')
        await db.insertRepo(fixtures.upl)
    })



    it('sends `hello` on connection', async () => {
        const client = createClient()

        assert.deepStrictEqual(
            await client.receive(),
            {type: 'hello'},
        )

        client.terminate()
    })



    describe('login', () => {
        it('fails if the request is invalid', async () => {
            user.send({type: 'login'})

            assert.deepStrictEqual(
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

            assert.deepStrictEqual(
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

            assert.deepStrictEqual(
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

            assert.deepStrictEqual(
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
                gitUrl: fixtures.mit.gitUrl,
                webUrl: '',
            })

            assert.deepStrictEqual(
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
                name: 'mit',
                gitUrl: 'badurl',
                webUrl: '',
            })

            assert.deepStrictEqual(
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
                fixtures.upl,
            ))

            assert.deepStrictEqual(
                await admin.receive(),
                {
                    type: 'createRepoError',
                    body: {
                        type: 'nameAlreadyExists',
                        name: 'upl',
                    },
                }
            )
        })

        it('works', async () => {
            admin.send({
                type: 'createRepo',
                name: fixtures.mit.name,
                gitUrl: fixtures.mit.gitUrl,
                webUrl: '',
            })

            assert.deepStrictEqual(
                await admin.receive(),
                {
                    type: 'createRepo',
                    body: 'mit',
                },
            )

            while (true) {
                const msg = await admin.receive()
                assert(msg.type === 'repo')

                if (!msg.body.cloned) {
                    const expected = Object.assign(
                        {
                            beingPulled: msg.body.beingPulled,
                        },
                        fixtures.mit,
                    )

                    repoEqual(
                        msg.body,
                        expected,
                    )
                } else {
                    repoEqual(
                        msg.body,
                        Object.assign(
                            {},
                            fixtures.mit,
                            {
                                cloned: true,
                                beingPulled: false,
                                pulledAt: 123456,
                            },
                        )
                    )

                    await wait(100)

                    return
                }
            }
        }).timeout(10 * 1000)
    })

    describe('fetchRepo', () => {
        it('fails with an non-existent repo', async () => {
            user.send({
                type: 'fetchRepo',
                name: 'unknown',
            })

            assert.deepStrictEqual(
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
                name: fixtures.upl.name,
            })

            assert.deepStrictEqual(
                await user.receive(),
                {
                    type: 'repo',
                    body: Object.assign(
                        {beingPulled: false},
                        fixtures.upl,
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

            assert.deepStrictEqual(
                await user.receive(),
                {
                    type: 'repos',
                    body: [
                        Object.assign(
                            {beingPulled: false},
                            fixtures.upl,
                        )
                    ],
                },
            )
        })
    })

    describe('deleteRepo', () => {
        it('fails if the user is not logged in', async () => {
            user.send({type: 'deleteRepo'})

            assert.deepStrictEqual(
                await user.receive(),
                {
                    type: 'deleteRepoError',
                    body: {type: 'notLoggedIn'},
                },
            )
        })

        it('works', async () => {
            admin.send({type: 'deleteRepo', name: 'upl'})

            assert.deepStrictEqual(
                await admin.receive(),
                {
                    type: 'deleteRepo',
                    body: 'upl',
                },
            )

            assert.deepStrictEqual(
                await user.receive(),
                {
                    type: 'deleteRepo',
                    body: 'upl',
                },
            )

            user.send({
                type: 'fetchRepos',
            })

            assert.deepStrictEqual(
                await user.receive(),
                {
                    type: 'repos',
                    body: [],
                },
            )
        })
    })
})
