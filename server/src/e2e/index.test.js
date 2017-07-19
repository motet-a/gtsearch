
const {assert} = require('chai')
const wdio = require('webdriverio')

const fixtures = require('../test-fixtures')
const createTestServer = require('../create-test-server')
const Client = require('../ws-test-client')
const util = require('./util')
const {navigate, browser, assertPath} = util

describe('e2e', function () {
    this.timeout(1000 * 1000)

    let serverConfig
    let client

    const createClient = () =>
        new Client('ws://' + serverConfig.address + ':' + serverConfig.port)

    const createAdmin = async () => {
        let admin = createClient()

        // Wait for the `hello` message from the server to make sure
        // the websockets are opened
        await admin.receive()

        admin.flushReceivedMessages()
        admin.send({
            type: 'login',
            plaintextPassword: serverConfig.adminPassword,
        })
        assert.deepEqual(
            await admin.receive(),
            {type: 'login'},
        )
        admin.flushReceivedMessages()
        admin.send({
            type: 'createRepo',
            name: 'upl',
            gitUrl: fixtures.upl.gitUrl,
            webUrl: '',
        })

        assert.deepEqual(
            await admin.receive(),
            {
                type: 'createRepo',
                body: 'upl',
            },
        )
    }

    before(async () => {
        serverConfig = await createTestServer()
        util.setServerConfig(serverConfig)
        const {db} = serverConfig
        await db._db.run('DELETE FROM `repos`;')

        await createAdmin()

        util.setBrowser(wdio.remote({
            host: process.env.GTSEARCH_SELENIUM_HOST || 'localhost',
            port: ~~process.env.GTSEARCH_SELENIUM_PORT || 4444,
            desiredCapabilities: {
                browserName: 'chrome',
            },
            screenshotPath: __dirname,
            screenshotOnReject: true,
        }))

        await browser().init()
    })

    beforeEach(async () => {
        const {db, clones} = serverConfig

        const repos = await db.getRepos()
        for (const repo of repos) {
            if (repo.name !== 'upl') {
                await db.deleteRepo(repo.name)
                await clones.remove(repo.name)
            }
        }
    })

    after(async () => {
        serverConfig.server.close()
        if (browser()) {
            await browser().endAll()
        }
    })

    it('loads properly the index page', () =>
        navigate()
            .getTitle().then(
                title => assert(title === 'gtsearch')
            )

            .getAttribute('header a', 'href').then(
                assertPath('/')
            )

            .getText('h1').then(
                text => assert(text === 'repositories')
            )

            .getUrl().then(
                assertPath('/')
            )
    )

    it('navigates between pages, keeping the browser URL in sync', () =>
        navigate()
            .click('header a')

            .getUrl().then(
                assertPath('/')
            )

            .click('footer a:nth-child(2)') // `login` link

            .getUrl().then(
                assertPath('/login')
            )

            .click('footer a:nth-child(1)') // `about` link

            .getUrl().then(
                url => assert(url === 'https://github.com/motet-a/gtsearch')
            )
    )

    require('./repos.test')
})
