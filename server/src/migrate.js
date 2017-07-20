
const assert = require('assert')
const {migrate} = require('@motet-a/migrate')

const getPersistentStore = db => ({
    async load() {
        if (!await db.tableExists('migrations')) {
            return
        }

        const row = await db.get(
            `SELECT *
            FROM migrations;`
        )

        return row ? row.data : undefined
    },

    async save(data) {
        assert(typeof data === 'string')

        if (!await db.tableExists('migrations')) {
            await db.run(
                `CREATE TABLE migrations (
                    id INTEGER PRIMARY KEY CHECK (id = 0),
                    data TEXT NOT NULL
                );`
            )

            await db.run(
                `INSERT INTO migrations (
                    id,
                    data
                ) VALUES (0, ?);`,
                data
            )
        } else {
            await db.run(
                `UPDATE migrations
                SET data = ?
                WHERE id = 0;`,
                data
            )
        }
    },
})


const getMigrations = db => [
    {
        name: '0-create-repos-table',
        async up() {
            await db.exec(
                `CREATE TABLE repos (
                    name TEXT NOT NULL PRIMARY KEY,
                    webUrl TEXT NOT NULL,
                    gitUrl TEXT NOT NULL,
                    cloned INTEGER NOT NULL,
                    fetchFailed INTEGER NOT NULL
                );`
            )
        },
    },

    {
        name: '1-create-admin-table',
        async up() {
            await db.exec(
                `CREATE TABLE admin (
                    id INTEGER PRIMARY KEY CHECK (id = 0),
                    hashedPassword TEXT NOT NULL
                );`
            )
        }
    },
]

module.exports = async db => {
    if (!await db.tableExists('migrations')) {
        await db.dropTables()
    }

    const store = getPersistentStore(db)
    const migrations = getMigrations(db)

    const migrator = migrate(store, migrations)
    await migrator.up()
}
