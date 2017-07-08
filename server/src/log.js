
exports.dummyLogger = {
    info() {},
    warn() {},
    error: console.error.bind(console),
}

exports.consoleLogger = console
