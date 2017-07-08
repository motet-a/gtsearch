
const path = require('path')
const fs = require('fs')
const url = require('url')
const crypto = require('crypto')
const util = require('util')
const child_process = require('child_process')

const randomString = async (length = 48) => {
    const buffer = await util.promisify(crypto.randomBytes)(length)
    return buffer.toString('hex')
}

const ipAddress = req => (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
)

const isValidGitUrl = string => {
    let parsed
    try {
        parsed = url.parse(string)
    } catch (error) {
        if (error instanceof URIError) {
            return false
        }

        throw error
    }

    const protocols = ['git:', 'ssh:', 'http:', 'https:']
    return parsed.host &&
           parsed.hostname &&
           parsed.slashes &&
           protocols.includes(parsed.protocol)
}

const fileExists = path =>
    new Promise(resolve =>
        fs.access(path, error => {
            resolve(!error)
        })
    )

const mkdirQuiet = async (path, mode) => {
    try {
        await util.promisify(fs.mkdir)(path, mode)
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err
        }
    }
}

const ensureVarDirExists = async () => {
    const varDir = path.join(__dirname, '..', 'var')

    await mkdirQuiet(varDir)
    await mkdirQuiet(path.join(varDir, 'clones'))
    await mkdirQuiet(path.join(varDir, 'test-clones'))
}

const exec = util.promisify(child_process.execFile)

module.exports = {
    randomString, ipAddress, isValidGitUrl,
    fileExists, mkdirQuiet, ensureVarDirExists,
    exec
}
