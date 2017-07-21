
// Javascript `cron`-like process for `git fetch`.
// Schedules repository updates.
class PullCron {
    // This cron is not started by default after a call to this
    // contructor. Use the `tick()` method.
    constructor({db, clones, log}) {
        this._log = log
        this._db = db
        this._clones = clones
        this._timeout = null
    }

    async _getRepoNamesToPull() {
        const defaultPullDelay = 30 * 1000
        return await this._db.getRepoNamesToPull(defaultPullDelay)
    }

    async _pullRepo(repoName) {
        await this._clones.pull(repoName)
    }

    async _tick() {
        const names = await this._getRepoNamesToPull()
        const log = this._log
        const db = this._db

        for (const name of names) {
            log.info('pulling ' + name)
            try {
                await this._clones.pull(name)
                log.info('pulled ' + name)
            } catch (error) {
                await db.setRepoPullFailed(name, true)
                log.error(error)
            }
            await db.setRepoPullFailed(name, false)
        }
    }

    // Use this function to start the scheduler.
    tick() {
        clearTimeout(this._timeout)

        this._tick()
            .catch(this._log.error)

        setTimeout(
            () => this.tick(),
            5 * 1000
        )
    }
}

module.exports = args =>
    new PullCron(args)
