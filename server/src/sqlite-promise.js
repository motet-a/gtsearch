
// TODO: Consider using https://github.com/kriasoft/node-sqlite.

const {promisify} = require('util')
const sqlite3 = require('sqlite3')

const promisifyDb = db => {
    const self = {
        run: promisify(db.run.bind(db)),
        all: promisify(db.all.bind(db)),
        get: promisify(db.get.bind(db)),
        exec: promisify(db.exec.bind(db)),
        close: promisify(db.close.bind(db)),

        async getTableNames() {
            const names = (await self.all(
                `SELECT name
                FROM sqlite_master
                WHERE type='table';`
            )).map(db => db.name)
            names.sort()
            return names
        },

        async dropTables() {
            const names = await self.getTableNames()

            await Promise.all(names.map(
                n => self.run('DROP TABLE `' + n + '`;')
            ))
        },

        async truncateTables() {
            const names = await self.getTableNames()

            await Promise.all(names.map(
                n => self.run('DELETE FROM `' + n + '`;')
            ))
        },

        async tableExists(tableName) {
            return !!await self.get(
                `SELECT name
                FROM sqlite_master
                WHERE type='table' AND name=?;`,
                tableName
            )
        },
    }

    return self
}

module.exports = async (...args) => {
    const db = await new Promise((resolve, reject) => {
        // The people at sqlite3 decided to use a callback in a
        // constructor... It looks terribly messy :-p
        const db = new sqlite3.Database(...args, err => {
            if (err) {
                reject(err)
                return
            }

            resolve(db)
        })
    })

    return promisifyDb(db)
}
