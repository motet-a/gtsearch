
const {ensureVarDirExists} = require('./util')
const createDb = require('./db')
const createClones = require('./clones')
const createSearches = require('./searches')
const serve = require('./serve')

const main = async () => {
    await ensureVarDirExists()

    const db = await createDb('gtsearch')
    const clones = createClones('clones')
    const searches = createSearches()

    const adminPassword = await db.setupAdmin()
    if (adminPassword) {
        console.log('admin password: ' + adminPassword)
    }

    const address = process.env.GTSEARCH_ADDRESS || 'localhost'
    const port = ~~process.env.GTSEARCH_PORT || 8080
    const server = await serve({db, clones, searches, address, port})

    const stop = () => {
        console.log('\nstopping server')
        server.wss.close(() => {
            server.close(async () => {
                console.log('closing db')
                await db.close()
                process.exit(0)
            })
        })
    }

    process.on('SIGTERM', stop)
    process.on('SIGINT', stop)

    console.log('listening on ' + address + ':' +  port)
}

main().catch(err => {
    console.error('fatal error:', err)
    process.exit(1)
})
