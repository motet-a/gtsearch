
const {assert} = require('chai')

const createDb = require('./db')
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
    fetchFailed: false,
}

const freebsdRepo = {
    name: 'freebsd',
    gitUrl: 'https://github.com/freebsd/freebsd.git',
    webUrl: '',
    cloned: false,
    fetchFailed: false,
}

describe('db', () => {
    let db

    beforeEach(async () => {
        db = await createDb('test')
        await db._db.truncateTables()
        await db.setupAdmin()
    })
    afterEach(async () => {
        await db.close()
    })

    it('creates tables', async () => {
        assert.deepEqual(
            await db._db.getTableNames(),
            ['admin', 'repos']
        )
    })

    it('inserts repo', async () => {
        await db.insertRepo(linuxRepo)

        assert.deepEqual(
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

        assert.deepEqual(
            await db.getRepo('linux'),
            linuxRepo
        )
    })

    it('gets repos', async () => {
        assert.deepEqual(await db.getRepos(), [])

        await db.insertRepo(freebsdRepo)

        assert.deepEqual(await db.getRepos(), [
            freebsdRepo,
        ])

        await db.insertRepo(linuxRepo)

        assert.deepEqual(await db.getRepos(), [
            freebsdRepo,
            linuxRepo,
        ])
    })

    it('sets the fetchFailed field of a repo', async () => {
        // Must not throw
        await db.setRepoFetchFailed('nonExistent', true)

        await db.insertRepo(linuxRepo)

        await db.setRepoFetchFailed('linux', true)

        assert.deepEqual(
            await db.getRepo('linux'),
            Object.assign(
                {},
                linuxRepo,
                {fetchFailed: true}
            )
        )

        await db.setRepoFetchFailed('linux', false)

        assert.deepEqual(
            await db.getRepo('linux'),
            linuxRepo
        )
    })

    it('sets the cloned field of a repo', async () => {
        // Must not throw
        await db.setRepoCloned('nonExistent', true)

        await db.insertRepo(linuxRepo)

        await db.setRepoCloned('linux', true)

        assert.deepEqual(
            await db.getRepo('linux'),
            Object.assign(
                {},
                linuxRepo,
                {cloned: true}
            )
        )

        await db.setRepoCloned('linux', false)

        assert.deepEqual(
            await db.getRepo('linux'),
            linuxRepo
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
        assert.deepEqual(Object.keys(admin), ['hashedPassword'])
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
