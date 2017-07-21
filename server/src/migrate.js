
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
        },
    },

    {
        name: '2-pull-repos-automatically',
        async up() {
            await db.exec(
                `ALTER TABLE repos
                ADD COLUMN fetchDelay INTEGER;`
            )

            await db.exec(
                `ALTER TABLE repos
                ADD COLUMN fetchedAt INTEGER;`
            )
        },
    },

    {
        name: '3-rename-fetch-to-pull-in-the-repos-table',
        async up() {
            await db.exec(
                `ALTER TABLE repos
                RENAME TO repos_old;`
            )

            await db.exec(
                `CREATE TABLE repos (
                    name TEXT NOT NULL PRIMARY KEY,
                    webUrl TEXT NOT NULL,
                    gitUrl TEXT NOT NULL,
                    cloned INTEGER NOT NULL,
                    pullFailed INTEGER NOT NULL,
                    pullDelay INTEGER,
                    pulledAt INTEGER
                );`
            )

            await db.exec(
                `INSERT INTO repos(
                    name, webUrl, gitUrl, cloned, pullFailed,
                    pullDelay, pulledAt
                )
                SELECT name, webUrl, gitUrl, cloned, fetchFailed,
                    fetchDelay, fetchedAt
                FROM repos_old;`
            )

            await db.exec(
                `DROP TABLE repos_old;`
            )
        },
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
