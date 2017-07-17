
const {assert} = require('chai')
const wdio = require('webdriverio')

const createTestServer = require('../create-test-server')

describe('e2e', function () {
    this.timeout(1000 * 1000)

    let client
    let serverConfig

    const serverHostFormSelenium = process.env.GTSEARCH_SERVER_HOST_FROM_SELENIUM || 'server'

    const navigate = (path = '') =>
        client.url('http://' + serverHostFormSelenium + ':' + serverConfig.port)

    before(async () => {
        serverConfig = await createTestServer()

        client = wdio.remote({
            host: process.env.GTSEARCH_SELENIUM_HOST || 'localhost',
            port: ~~process.env.GTSEARCH_SELENIUM_PORT || 4444,
            desiredCapabilities: {
                browserName: 'chrome',
            },
        })

        await client.init()
    })

    after(async () => {
        serverConfig.server.close()
        await client.endAll()
    })

    it('loads properly the index page',
       () => {
           return navigate()
               .getTitle().then(title => assert(title === 'gtsearch'))
               .getText('h1').then(text => assert(text === 'repositories'))
       }
    )

    it('clones a repository')

    it('pulls an existing repository')

    it('searches in a repository')
})
