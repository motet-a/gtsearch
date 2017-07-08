
const assert = require('assert')
const EventEmitter = require('events')

const newSearch = require('./search')
const BufferedSearch = require('./buffered-search')

class DelayedBufferedSearch extends EventEmitter {
    constructor(query) {
        super()
        this._query = query
        this._bufferedSearch = null

        // `true` when `this.killed()` has been called before `this.start()`
        this._doNotStart = false
    }

    start() {
        if (this._doNotStart) {
            return
        }

        assert(!this._started, 'Search already started')

        const bs = new BufferedSearch(newSearch(this._query))
        this._bufferedSearch = bs

        bs.on(
            'exit',
            arg => this.emit('exit', arg),
        )

        bs.on(
            'stderr',
            arg => this.emit('stderr', arg),
        )

        bs.on(
            'results',
            arg => this.emit('results', arg),
        )
    }

    // Sends a SIGTERM. Only SIGTERM is supported.
    kill() {
        if (!this._bufferedSearch) {
            this._doNotStart = true
            this.emit('exit', {
                code: null,
                error: new Error('SIGTERM'),
                terminated: true,
            })
            return
        }

        assert(!this.exited)
        this._bufferedSearch.kill()
    }

    pause() {
        this._bufferedSearch.pause()
    }

    resume() {
        this._bufferedSearch.resume()
    }

    get paused() {
        return this.started && this._bufferedSearch.paused
    }

    get started() {
        return !!this._bufferedSearch
    }

    get exited() {
        return this._doNotStart || !!(
            this._bufferedSearch &&
            this._bufferedSearch.exited
        )
    }
}

module.exports = DelayedBufferedSearch
