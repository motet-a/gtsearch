
const assert = require('assert')
const DelayedBufferedSearch = require('./delayed-buffered-search')

class Searches {
    constructor(maxSearchCount = 5) {
        this._pending = []
        this._running = []
        this._maxSearchCount = maxSearchCount
    }

    _tryToStartSearch() {
        if (!this._pending.length ||
            this._running.length >= this._maxSearchCount) {
            return
        }

        const task = this._pending[this._pending.length - 1]
        this._pending.pop()

        task.start()

        this._running.push(task)

        this._tryToStartSearch()
    }

    search(query) {
        const task = new DelayedBufferedSearch(query)

        let exited = false
        task.on('exit', arg => {
            assert(!exited)
            exited = true
            this._pending = this._pending.filter(
                s => s !== task
            )
            this._running = this._running.filter(
                s => s !== task
            )
            this._tryToStartSearch()
        })

        this._pending.unshift(task)
        this._tryToStartSearch()
        return task
    }
}

module.exports = (...args) =>
    new Searches(...args)
