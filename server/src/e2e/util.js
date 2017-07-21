
const assert = require('assert')
const url = require('url')

let browser
let serverConfig

const serverHostFromSelenium = process.env.GTSEARCH_SERVER_HOST_FROM_SELENIUM || 'server'

const navigate = (path = '') =>
    browser.url(
        'http://' + serverHostFromSelenium + ':' + serverConfig.port + path
    )

const getPathFromUrl = urlString =>
    url.parse(urlString).path

const assertPath = path => url =>
    assert.equal(getPathFromUrl(url), path)

// Redirects to `/`
const login = () =>
    navigate('/login')
        .setValue('.LoginPage input', serverConfig.adminPassword)
        .click('.LoginPage .Button')
        .pause(200)
        .getUrl(assertPath('/'))

const getPath = async () =>
    getPathFromUrl(
        await browser.getUrl()
    )

module.exports = {
    browser: () => browser,
    navigate,
    setBrowser: b => browser = b,
    setServerConfig: config => serverConfig = config,

    getPath,
    getPathFromUrl,
    assertPath,
    login,
}
