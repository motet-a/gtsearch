// Functions to manage cloned Git repositories

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
        // But they bypasses the piped stdin and read directly
        // from the TTY by default.
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

class Clones {
    constructor(baseDirName) {
        this._basePath = path.join(__dirname, '..', 'var', baseDirName)
        this._beingFetched = new Set()
    }

    isBeingFetched(name) {
        return this._beingFetched.has(name)
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

    // `onFetchStart` is called just after
    // `clones.isBeingFetched(name)` becomes `true`
    async clone(url, name, options = {}) {
        const onFetchStart = options.onFetchStart || (() => {})

        assert(!this.isBeingFetched(name))

        try {
            this._beingFetched.add(name)
            onFetchStart()

            await this.remove(name)

            const dir = this.path(name)
            await promisify(fs.mkdir)(dir)

            await execGit(
                [
                    'clone',
                    '--quiet',
                    '--depth=1',
                    '--',
                    url,
                    dir,
                ],

                {timeout: 60 * 1000},
            )
        } finally {
            this._beingFetched.delete(name)
        }
    }

    async pull(name, options = {}) {
        const onFetchStart = options.onFetchStart || (() => {})

        const dir = this.path(name)

        try {
            this._beingFetched.add(name)
            onFetchStart()

            const branch = await this._getCurrentBranch(name)

            await execGit(
                [
                    '-C',
                    dir,
                    'fetch',
                    '-f',
                    '--quiet',
                    '--depth=1',
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
            this._beingFetched.delete(name)
        }
    }

    exists(name) {
        return fileExists(this.path(name))
    }

    async remove(name) {
        await promisify(rimraf)(this.path(name))
    }
}

const newClones = baseDirName =>
    new Clones(baseDirName)

Object.assign(newClones, {errors, isClonesError})

module.exports = newClones
