
const {assert} = require('chai')

const {navigate, assertPath, login, browser, getPath} = require('./util')
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
                4 * 1000,
            )

    const currentPathEqual = async path =>
        path === await getPath()

    const waitUntilPageChanged = newPagePath =>
        browser()
            .waitUntil(
                async () => await currentPathEqual(newPagePath),
                10 * 1000,
                'The client should navigate to ' + newPagePath,
                100,
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

        await waitUntilPageChanged('/repository/mit/info')
        const status = await getStatus()
        assert(
            status === 'status: not cloned yet, being pulled' ||
            status === 'status: not cloned yet'
        )
        await waitWhileStatusIsVisible()
    })

    it('searches in a repository')
})
