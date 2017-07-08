
const assert = require('assert')
const EventEmitter = require('events')

// A cancellable and pausable search task.
// TODO: Improve this mess
class BufferedSearch extends EventEmitter {
    constructor(search) {
        super()
        this._search = search
        this._buffer = []

        // Must be `null` after `this._search` has exited
        // Must be `null` if `this._search` is running
        this._pauseTimer = null

        // TODO: Try to remove this
        this._emittingResults = true

        this._paused = false

        // Must be `true` once the `exit` event has been sent.
        this._exited = false

        search.on(
            'exit',
            () => this.sendBufferedResults(),
        )

        search.on(
            'stderr',
            arg => this.emit('stderr', arg)
        )

        search.on(
            'results',
            results => {
                if (this._search.exited) {
                    // This happens sometimes.
                    return
                }

                this._buffer = this._buffer.concat(results)
                this.sendBufferedResults()
            }
        )
    }

    // Sends a SIGTERM. Only SIGTERM is supported.
    // Emits an `exit` event immediately.
    kill() {
        assert(!this.exited, 'Not running')

        this._buffer = []
        this._emittingResults = false

        this._paused = false
        clearTimeout(this._pauseTimer)
        this._pauseTimer = null

        if (this._search.exited) {
            this._exitReason = {
                code: null,
                error: new Error('SIGTERM'),
                terminated: true,
            }
            this.sendBufferedResults()
            return
        }

        this._search.kill()
    }

    sendBufferedResults() {
        if (this.exited || this.paused) {
            return
        }

        const toSend = this._buffer.slice(0, 40)
        if (toSend.length) {
            assert(!this.exited)
            this.emit('results', toSend)
            this._buffer = this._buffer.slice(toSend.length)

            setTimeout(() => this.sendBufferedResults(), 0)
        } else if (this._search.exited || this._exitReason) {
            this._exited = true
            clearTimeout(this._pauseTimer)
            this._pauseTimer = null
            this.emit('exit', this.exitReason)
        }
    }

    pause() {
        assert(!this.paused && !this.exited && this._emittingResults)

        this._emittingResults = false

        this._paused = true
        this._pauseTimer = setTimeout(
            () => {
                assert(!this.exited)
                this.kill()
            },
            30 * 1000,
        )

        if (!this._search.exited) {
            this._search.kill('SIGTSTP')
        }
    }

    resume() {
        assert(this.paused && !this.exited)

        this._emittingResults = true

        this._paused = false
        clearTimeout(this._pauseTimer)
        this._pauseTimer = null

        this.sendBufferedResults()

        if (!this._search.exited) {
            this._search.kill('SIGCONT')
        }
    }

    get paused() {
        if (this.exited) {
            return false
        }
        return this._paused
    }

    get exited() {
        return this._exited
    }

    get exitReason() {
        return this._search.exitReason || this._exitReason
    }
}

module.exports = BufferedSearch
