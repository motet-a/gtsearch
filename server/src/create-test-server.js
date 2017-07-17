
const createSearches = require('./searches')
const {dummyLogger} = require('./log')
const createDb = require('./db')
const createClones = require('./clones')
const serve = require('./serve')

module.exports = async () => {
    const address = '0.0.0.0'
    const port = 8081

    const db = await createDb('test')
    await db._db.truncateTables()
    await db.setupAdmin()

    const adminPassword = await db.resetAdminPassword()
    const clones = createClones('test-clones')
    const searches = createSearches()
    const log = dummyLogger

    const server = await serve({
        db, clones, searches, log,
        address, port,
    })

    return {
        adminPassword,
        db, clones, searches, log,
        server,
        address, port,
    }
}
