
const sinon = require('sinon')
const {assert} = require('chai')

const createSearchImpl = require('./search')

const createSearch = pattern =>
    createSearchImpl({
        rootDirectory: __dirname,
        pattern,
    })

describe('Search', () => {
    it('throws with an empty pattern', () => {
        assert.throws(
            () => createSearch(''),
        )
    })

    it("raises an 'exit' event when killed", () => {
        const p = createSearch('search')
        assert(!p.exited)

        const onExit = sinon.spy()
        const onError = sinon.spy()
        p.on('exit', onExit)
        p.on('error', onError)

        assert(onExit.notCalled)
        p.kill()
        assert(p.exited)
        assert(onExit.calledOnce)
        const exitReason = onExit.args[0][0]
        assert(exitReason.terminated)
        assert(exitReason.code === null)
        assert(exitReason.error.message === 'SIGTERM')

        assert.throws(
            () => p.kill(),
            /Not running/,
        )

        assert(onError.notCalled)
    })

    it('works', done => {
        const p = createSearch('search')

        const checkResult = result => {
            assert(typeof result.filePath === 'string')
            assert(typeof result.lineNumber === 'number')
            assert(typeof result.byteOffset === 'number')
            assert(result.line.toLowerCase().includes('search'))
        }

        const checkResults = results =>
            results.forEach(checkResult)

        const onResults = sinon.spy()
        const onError = sinon.spy()
        const onExit = sinon.spy(() =>
            setTimeout(afterExit, 10)
        )

        const afterExit = () => {
            assert(onExit.calledOnce)
            assert.deepEqual(
                onExit.args[0][0],
                {
                    code: 0,
                    error: null,
                    terminated: false,
                },
            )

            assert(onError.notCalled)
            assert(onResults.args.length >= 1)
            const results = onResults.args[0][0]
            checkResults(results)
            done()
        }

        p.on('results', onResults)
        p.on('error', onError)
        p.on('exit', onExit)
    })
})
