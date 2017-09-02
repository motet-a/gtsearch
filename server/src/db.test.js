
const assert = require('assert')

const createDb = require('./db')
const {repoEqual, repoListEqual} = require('./util')
const {isDbError} = createDb

const assertDbError = expectedErrorCode => error => {
    assert(isDbError(error))
    assert.equal(error.code, 'ALREADY_EXISTS')
}

const throwsDbError = async (func, expectedErrorCode) => {
    try {
        await func()
    } catch (error) {
        assertDbError(expectedErrorCode)(error)
        return
    }
    assert(false, 'Expected DB error: ' + expectedErrorCode)
}

const linuxRepo = {
    name: 'linux',
    gitUrl: 'https://github.com/torvalds/linux.git',
    webUrl: '',
    cloned: false,
    pullDelay: null,
    pullFailed: false,
    pulledAt: null,
    branch: null,
}

const freebsdRepo = {
    name: 'freebsd',
    gitUrl: 'https://github.com/freebsd/freebsd.git',
    webUrl: '',
    cloned: false,
    pullDelay: null,
    pullFailed: false,
    pulledAt: null,
    branch: null,
}

describe('db', () => {
    let db

    // TODO: Avoid applying every migration before each test, it's too slow
    beforeEach(async function () {
        this.timeout(5 * 1000)

        db = await createDb('test', {dropTables: true})
        await db.setupAdmin()
    })
    afterEach(async () => {
        await db.close()
    })

    it('creates tables', async () => {
        assert.deepStrictEqual(
            await db._db.getTableNames(),
            ['admin', 'migrations', 'repos']
        )
    })

    it('inserts repo', async () => {
        await db.insertRepo(linuxRepo)

        repoEqual(
            await db.getRepo('linux'),
            linuxRepo
        )

        await throwsDbError(
            () => db.insertRepo(linuxRepo),
            'ALREADY_EXISTS'
        )
    })

    it('gets repo', async () => {
        assert(null == await db.getRepo('linux'))

        await db.insertRepo(linuxRepo)

        repoEqual(
            await db.getRepo('linux'),
            linuxRepo
        )
    })

    it('gets repos', async () => {
        repoListEqual(
            await db.getRepos(),
            []
        )

        await db.insertRepo(freebsdRepo)

        repoListEqual(
            await db.getRepos(),
            [freebsdRepo]
        )

        await db.insertRepo(linuxRepo)

        repoListEqual(
            await db.getRepos(),
            [freebsdRepo, linuxRepo]
        )
    })

    it('sets the pullFailed field of a repo', async () => {
        // Must not throw
        await db.setRepoPullFailed('nonExistent', true)

        await db.insertRepo(linuxRepo)

        await db.setRepoPullFailed('linux', true)

        let actualLinux = await db.getRepo('linux')
        assert(actualLinux.pulledAt &&
               typeof actualLinux.pulledAt === 'number')

        repoEqual(
            await db.getRepo('linux'),
            Object.assign(
                {},
                linuxRepo,
                {
                    pullFailed: true,
                    pulledAt: 12345678,
                }
            )
        )

        await db.setRepoPullFailed('linux', false)

        repoEqual(
            await db.getRepo('linux'),
            Object.assign(
                {},
                linuxRepo,
                {
                    pulledAt: 12345678,
                }
            )
        )
    })

    it('sets the cloned field of a repo', async () => {
        // Must not throw
        await db.setRepoCloned('nonExistent', true)

        await db.insertRepo(linuxRepo)

        await db.setRepoCloned('linux', true)

        repoEqual(
            await db.getRepo('linux'),
            Object.assign(
                {},
                linuxRepo,
                {
                    cloned: true,
                    pulledAt: 12345678,
                }
            )
        )

        await db.setRepoCloned('linux', false)

        repoEqual(
            await db.getRepo('linux'),
            Object.assign(
                {},
                linuxRepo,
                {
                    pulledAt: 12345678,
                }
            )
        )
    })

    it('deletes repos', async () => {
        // Must not throw
        await db.deleteRepo('nonExistent')

        await db.insertRepo(linuxRepo)
        await db.deleteRepo('linux')
        assert(!await db.getRepo('linux'))
    })

    it('gets admin', async () => {
        const admin = await db.getAdmin()
        assert.deepStrictEqual(Object.keys(admin), ['hashedPassword'])
    })

    it('checks admin passwords', async () => {
        assert(!await db.checkAdminPassword('hey'))
        await db.setAdminPassword('hey')
        assert(await db.checkAdminPassword('hey'))
    })

    it('sets admin passwords', async () => {
        await db.setAdminPassword('hello')
        assert(await db.checkAdminPassword('hello'))
    })
})
