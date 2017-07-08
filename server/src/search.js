
const assert = require('assert')
const child_process = require('child_process')
const EventEmitter = require('events')

// Returns `null` on parse error
const parseGrepLine = source => {
    const zero = source.indexOf('\0')
    if (zero === -1) {
        return null
    }

    const filePath = source.slice(0, zero)

    source = source.slice(zero + 1)

    let colon = source.indexOf(':')
    if (colon === -1) {
        return null
    }

    const lineNumber = parseInt(source.slice(0, colon))
    if (isNaN(lineNumber)) {
        return null
    }
    source = source.slice(colon + 1)
    colon = source.indexOf(':')
    if (colon === -1) {
        return null
    }
    const byteOffset = parseInt(source.slice(0, colon))
    if (isNaN(byteOffset)) {
        return null
    }
    const line = source.slice(colon + 1)

    return {filePath, lineNumber, byteOffset, line}
}

const parseGrepLines = source =>
    source.split('\n')
          .map(parseGrepLine)
          .filter(l => l)

class Search extends EventEmitter {
    constructor({rootDirectory, pattern, process}) {
        super()
        this._process = process
        this._rootDirectory = rootDirectory
        this._pattern = pattern
        this._exitReason = null

        process.on('exit', code =>
            this._emitExit({
                code,
                error: null,
                terminated: false,
            })
        )

        process.on('error', error => this._onError(error))

        process.stderr.on('data', data => {
            this.emit('stderr', data)
        })

        process.stdout.on('data', data => {
            this.emit('results', parseGrepLines(data.toString()))
        })
    }

    _emitExit(reason) {
        if (this.exited) {
            return
        }

        this._exitReason = reason
        this.emit('exit', reason)
    }

    _onError(error, terminated = false) {
        this._emitExit({
            code: null,
            error,
            terminated,
        })
    }

    // Emits an `exit` event immediately if the signal is `SIGTERM`.
    kill(signal = 'SIGTERM') {
        assert(!this.exited, 'Not running')
        this._process.kill(signal)

        if (signal === 'SIGTERM') {
            this._onError(new Error(signal), true)
        }
    }

    get exitReason() {
        return this._exitReason
    }

    get exited() {
        return !!this.exitReason
    }
}


const createSearch = ({rootDirectory, pattern, ignoreCase}) => {
    assert(typeof pattern === 'string')
    assert(pattern.length)

    const process = child_process.spawn(
        'grep',

        [
            '--exclude-dir=.git',
            '--fixed-strings',
            '--recursive',
            '--color=never',
            '--with-filename',
            '--byte-offset',
            '--line-buffered',
            '--line-number',
            '--null',
            ignoreCase && '--ignore-case',

            '-e',
            pattern,
        ].filter(v => v),

        {
            cwd: rootDirectory,
        }
    )

    return new Search({rootDirectory, pattern, process})
}

module.exports = createSearch
