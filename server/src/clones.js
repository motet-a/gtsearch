// Functions to manage cloned Git repositories

const EventEmitter = require('events')
const assert = require('assert')
const {promisify} = require('util')
const fs = require('fs')
const rimraf = require('rimraf')
const path = require('path')

const {fileExists, exec} = require('./util')

const clonesErrorSymbol = Symbol()

const errors = {
    TIMED_OUT: 'TIMED_OUT',
    AUTH_FAILED: 'AUTH_FAILED',
}

const newClonesError = code => {
    assert(errors[code])
    const e = new Error('ClonesError: ' + code)
    e.code = code
    e[clonesErrorSymbol] = clonesErrorSymbol
    return e
}

const isClonesError = error =>
    error && error[clonesErrorSymbol] === clonesErrorSymbol

const execGit = async (args, options) => {
    const env = {
        // Sometimes some Git commands ask for a password.
        // But they bypass the piped stdin stream and read directly
        // from the TTY by default. Shit happens.
        // This hack forces Git not to ask for passwords.
        GIT_ASKPASS: 'echo',
    }

    try {
        return await exec(
            'git',
            args,
            Object.assign(
                {env},
                options,
            ),
        )
    } catch (error) {
        if (error.killed) {
            throw newClonesError(errors.TIMED_OUT)
        }

        if (error.stderr.includes('Authentication failed')) {
            throw newClonesError(errors.AUTH_FAILED)
        }

        throw error
    }
}

// Events:
//   - `pullStart` is emitted at the moment when a repo begins to
//     be pulled (or cloned)
//
//   - `pullEnd` is emitted at the moment when a pull (or clone)
//     ends (successfully or not).
//
// Given a repository A, `pullEnd` and `pullStart` are emitted just
// after the return value of `clones.isBeingPulled(A)` has changed.
class Clones extends EventEmitter {
    constructor(baseDirName) {
        super()

        this._basePath = path.join(__dirname, '..', 'var', baseDirName)
        this._beingPulled = new Set()
    }

    isBeingPulled(name) {
        return this._beingPulled.has(name)
    }

    _emitPullStart(name) {
        assert(!this.isBeingPulled(name))
        this._beingPulled.add(name)
        this.emit('pullStart', {repoName: name})
    }

    _emitPullEnd(name) {
        assert(this.isBeingPulled(name))
        this._beingPulled.delete(name)
        this.emit('pullEnd', {repoName: name})
    }

    path(name) {
        return path.join(this._basePath, name)
    }

    async _getCurrentBranch(name) {
        const dir = this.path(name)

        const {stdout} = await execGit(
            [
                '-C',
                dir,
                'rev-parse',
                '--abbrev-ref',
                'HEAD',
            ]
        )

        return stdout.trim()
    }

    async clone(url, name, options) {
        assert(!options, 'deprecated')

        try {
            this._emitPullStart(name)

            await this.remove(name)

            const dir = this.path(name)
            await promisify(fs.mkdir)(dir)

            await execGit(
                [
                    'clone',
                    '--single-branch',
                    '--quiet',
                    '--',
                    url,
                    dir,
                ],

                {timeout: 60 * 1000},
            )
        } finally {
            this._emitPullEnd(name)
        }
    }

    async pull(name, options) {
        assert(!options, 'deprecated')

        const dir = this.path(name)

        try {
            this._emitPullStart(name)

            const branch = await this._getCurrentBranch(name)

            await execGit(
                [
                    '-C',
                    dir,
                    'fetch',
                    '-f',
                    '--quiet',
                    'origin',
                    branch,
                ],

                {timeout: 60 * 1000},
            )

            await execGit(
                [
                    '-C',
                    dir,
                    'reset',
                    '--hard',
                    'origin/' + branch,
                ]
            )
        } finally {
            this._emitPullEnd(name)
        }
    }

    exists(name) {
        return fileExists(this.path(name))
    }

    async remove(name) {
        await promisify(rimraf)(this.path(name))
    }
}

const createClones = baseDirName =>
    new Clones(baseDirName)

Object.assign(createClones, {errors, isClonesError})

module.exports = createClones
