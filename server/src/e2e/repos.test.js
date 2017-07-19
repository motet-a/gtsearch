
const {assert} = require('chai')

const {navigate, assertPath, login, browser} = require('./util')
const fixtures = require('../test-fixtures')

describe('repos', () => {
    it('shows the repository list', async () => {
        const link = '.ReposPage a.RepoLink'

        await navigate()
            .elements('.ReposPage a.RepoLink').then(
                repos => assert(repos.value.length === 1)
            )

            .getText(link + ' strong').then(
                t => assert(t === 'upl')
            )

            .getAttribute(link, 'href').then(
                assertPath('/repository/upl')
            )
    })

    const addRepo = '.ReposPage a:last-of-type'
    it('shows a link to add a repository when I am logged in', async () => {
        await login()
            .getText(addRepo).then(
                t => assert(t === 'add a repository')
            )
            .getAttribute(addRepo, 'href').then(
                assertPath('/create-repository')
            )

            .click(addRepo)
            .getUrl().then(
                assertPath('/create-repository')
            )
    })

    const getStatus = () =>
        browser()
            .element('.RepoInfoPage')
            .getText('div*=status')

    const statusExists = () =>
        browser()
            .element('.RepoInfoPage')
            .isExisting('div*=status')

    const waitWhileStatusIsVisible = () =>
        browser()
            .waitUntil(
                async () => !await statusExists(),
                2 * 1000,
            )

    it('clones a repository', async () => {
        await login()
            .click(addRepo)

            .getText('.CreateRepoPage h1').then(
                t => assert(t === 'add a repository')
            )

            .getAttribute('.CreateRepoPage input:first-of-type', 'placeholder').then(
                p => assert(p === 'unique name')
            )

            .getAttribute('.CreateRepoPage input:last-of-type', 'placeholder').then(
                p => assert(p === 'git repository url')
            )

            .getText('.CreateRepoPage .Button').then(
                t => assert(t === 'add')
            )

            .setValue(
                '.CreateRepoPage input:first-of-type',
                'mit',
            )
            .setValue(
                '.CreateRepoPage input:last-of-type',
                fixtures.mit.gitUrl,
            )
            .click('.CreateRepoPage .Button')

            .pause(200)

            .getUrl().then(
                assertPath('/repository/mit/info')
            )

        assert(
            await getStatus() === 'status: not cloned yet, being fetched'
        )

        await waitWhileStatusIsVisible()
    })

    it('pulls an existing repository', async () => {
        await login()
            .click('a.RepoLink=upl')
            .pause(200)
            .getUrl().then(
                assertPath('/repository/upl')
            )
            .click('a=upl')
            .pause(200)
            .getUrl().then(
                assertPath('/repository/upl/info')
            )
            .click('.Button=pull')

        assert(
            await getStatus() === 'status: being fetched'
        )

        await waitWhileStatusIsVisible()
    })

    it('searches in a repository')
})
