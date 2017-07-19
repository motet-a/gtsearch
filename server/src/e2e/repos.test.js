
const {assert} = require('chai')
const {navigate, assertPath, login, browser} = require('./util')

describe('repos', () => {
    it('shows the repository list', async () => {
        const link = '.ReposPage a.RepoLink'

        await navigate()
            .elements('.ReposPage a.RepoLink').then(
                repos => assert(repos.value.length === 1)
            )

            .getText(link + ' strong').then(
                t => assert(t === 'yan')
            )

            .getAttribute(link, 'href').then(
                assertPath('/repository/yan')
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
                10 * 1000,
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
                'gtsearch',
            )
            .setValue(
                '.CreateRepoPage input:last-of-type',
                'https://github.com/motet-a/gtsearch.git',
            )
            .click('.CreateRepoPage .Button')

            .pause(200)

            .getUrl().then(
                assertPath('/repository/gtsearch/info')
            )

        assert(
            await getStatus() === 'status: not cloned yet, being fetched'
        )

        await waitWhileStatusIsVisible()
    })

    it('pulls an existing repository', async () => {
        await login()
            .click('a.RepoLink=yan')
            .pause(200)
            .getUrl().then(
                assertPath('/repository/yan')
            )
            .click('a=yan')
            .pause(200)
            .getUrl().then(
                assertPath('/repository/yan/info')
            )
            .click('.Button=pull')

        assert(
            await getStatus() === 'status: being fetched'
        )

        await waitWhileStatusIsVisible()
    })

    it('searches in a repository')
})
