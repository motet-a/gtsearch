
const path = require('path')
const bcrypt = require('bcrypt')
const assert = require('assert')
const {promisify} = require('util')

const migrate = require('./migrate')
const {randomString} = require('./util')
const createSqliteDriver = require('./sqlite-promise')

const V = require('@motet_a/validate')

const repoSpec = V.shape({
    // A repo name must be a valid file name
    name: V.string.regexp(/[a-zA-Z0-9-_]+/).min(1).max(32),

    webUrl: V.string.max(256),
    gitUrl: V.string.min(1).max(256),
    cloned: V.boolean,
    pullFailed: V.boolean,
})

const repoFromSQLite = dbRepo => {
    if (!dbRepo) {
        return
    }

    return Object.assign({}, dbRepo, {
        cloned: !!dbRepo.cloned,
        pullFailed: !!dbRepo.pullFailed,
    })
}

const errors = {
    ALREADY_EXISTS: 'ALREADY_EXISTS',
}

const dbErrorSymbol = Symbol()

const newDbError = code => {
    assert(errors[code])
    const e = new Error('DbError: ' + code)
    e.code = code
    e[dbErrorSymbol] = dbErrorSymbol
    return e
}

const isDbError = error =>
    error && error[dbErrorSymbol] === dbErrorSymbol

const nowTimestamp = () =>
    new Date().getTime()

class Db {
    constructor(db) {
        assert(db)
        this._db = db
    }

    // Returns a Promise
    close() {
        promisify(cb => this._db.close(cb))
    }

    async getRepos() {
        const repos = await this._db.all(
            `SELECT *
            FROM repos;`
        )

        return repos.map(repoFromSQLite)
    }

    async getRepoNamesToPull(defaultPullDelay) {
        const repos = await this._db.all(
            `SELECT name, pulledAt, cloned, pullDelay
            FROM repos
            WHERE cloned AND (
                coalesce(pulledAt, 0) + coalesce(pullDelay, ?)
            ) < ?;`,
            defaultPullDelay,
            nowTimestamp()
        )

        return repos.map(r => r.name)
    }

    async getRepo(name) {
        const repo = await this._db.get(
            `SELECT *
            FROM repos
            WHERE name = ?;`,
            name
        )

        return repoFromSQLite(repo)
    }

    async insertRepo(repo) {
        repo = repoSpec(repo)

        try {
            return await this._db.run(
                `INSERT INTO repos (
                    name, webUrl, gitUrl, cloned, pullFailed, branch
                ) VALUES (?, ?, ?, ?, ?, ?);`,
                repo.name,
                repo.webUrl,
                repo.gitUrl,
                repo.cloned,
                repo.pullFailed,
                repo.branch
            )
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' &&
                error.message.includes('repos.name')) {
                throw newDbError(errors.ALREADY_EXISTS)
            }

            throw error
        }
    }

    // Returns a Promise
    setRepoPullFailed(name, pullFailed) {
        return this._db.run(
            `UPDATE repos
            SET pullFailed = ?, pulledAt = ?
            WHERE name = ?;`,
            pullFailed,
            nowTimestamp(),
            name
        )
    }

    // Returns a Promise
    setRepoCloned(name, cloned) {
        return this._db.run(
            `UPDATE repos
            SET cloned = ?, pulledAt = ?
            WHERE name = ?;`,
            cloned,
            nowTimestamp(),
            name
        )
    }

    // Returns a Promise
    setRepoBranch(name, branchName) {
        return this._db.run(
            `UPDATE repos
            SET branch = ?
            WHERE name = ?;`,
            branchName,
            name,
        )
    }

    // Returns a Promise
    deleteRepo(name) {
        return this._db.run(
            `DELETE FROM repos
            WHERE name = ?;`,
            name
        )
    }

    // Returns the new random plaintext password
    async _insertAdmin() {
        await this._db.run(
            `INSERT INTO admin (id, hashedPassword)
            VALUES (0, ?);`,
            await randomString()
        )

        return await this.resetAdminPassword()
    }

    async setupAdmin() {
        if (!await this.isAdminSetUp()) {
            return await this._insertAdmin()
        }
    }

    // Returns a Promise.
    // Resolves `null` if the admin row is not setup.
    _getAdmin() {
        return this._db.get(
            `SELECT *
            FROM admin;`
        )
    }

    async isAdminSetUp() {
        return !!await this._getAdmin()
    }

    async getAdmin() {
        const admin = await this._getAdmin()
        assert(admin)
        delete admin.id
        return admin
    }

    async checkAdminPassword(plaintextPassword) {
        const admin = await this.getAdmin()

        return await promisify(bcrypt.compare)(
            plaintextPassword,
            admin.hashedPassword
        )
    }

    async setAdminPassword(plaintextPassword) {
        const hashedPassword = await promisify(bcrypt.hash)(
            plaintextPassword,
            8
        )

        await this._db.run(
            `UPDATE admin
            SET hashedPassword = ?
            WHERE id = 0;`,
            hashedPassword
        )
    }

    // Returns the new random plaintext password
    async resetAdminPassword() {
        const password = await randomString()
        await this.setAdminPassword(password)
        return password
    }
}

const createDb = async (fileName, options = {}) => {
    const {dropTables} = options

    assert(typeof fileName === 'string')

    const filePath = path.join(
        __dirname, '..', 'var', fileName + '.sqlitedb'
    )

    const sqliteDriver = await createSqliteDriver(filePath)
    if (dropTables) {
        await sqliteDriver.dropTables()
    }
    await migrate(sqliteDriver)
    const db = new Db(sqliteDriver)
    return db
}

Object.assign(createDb, {repoSpec, errors, isDbError})

module.exports = createDb
