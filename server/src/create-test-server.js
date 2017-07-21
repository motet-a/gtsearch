
const createSearches = require('./searches')
const {dummyLogger} = require('./log')
const createDb = require('./db')
const createClones = require('./clones')
const createPullCron = require('./pull-cron')
const serve = require('./serve')

module.exports = async () => {
    const address = '0.0.0.0'
    const port = 8081

    const db = await createDb('test', {dropTables: true})
    await db.setupAdmin()

    const adminPassword = await db.resetAdminPassword()
    const clones = createClones('test-clones')
    const searches = createSearches()
    const log = dummyLogger
    const pullCron = createPullCron({db, clones, log})

    const server = await serve({
        db, clones, searches, log, pullCron,
        address, port,
    })

    return {
        adminPassword,
        db, clones, searches, log,
        server,
        address, port,
    }
}
