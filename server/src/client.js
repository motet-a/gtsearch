
const fs = require('fs')
const path = require('path')

// `filePath` must be trusted.
const createReadStreamUnsafe = filePath =>
    fs.createReadStream(path.join(__dirname, '..', '..', 'client', filePath))

const filePaths = [
    'dist/main.css',
    'dist/main.css.map',
    'dist/main.js',
    'dist/main.js.map',

    'index.html',
]

// The given `filePath` may be user-defined and not trusted.
// If the file is not found, `null` is returned.
const streamFile = filePath => {
    if (!filePaths.includes(filePath)) {
        return null
    }

    return createReadStreamUnsafe(filePath)
}

module.exports = {streamFile}
