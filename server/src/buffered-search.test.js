
const sinon = require('sinon')
const {assert} = require('chai')

const createSearchImpl = require('./search')
const BufferedSearch = require('./buffered-search')

const createSearch = pattern =>
    new BufferedSearch(
        createSearchImpl({
            rootDirectory: __dirname,
            pattern,
        })
    )

describe('BufferedSearch', () => {
    it('can be paused immediately after creation', done => {
        const p = createSearch('search')

        const onExit = sinon.spy(
            () => setTimeout(afterExit, 10)
        )

        const onError = sinon.spy()
        const onResults = sinon.spy()

        const afterExit = () => {
            assert(onExit.calledOnce)
            assert(onError.notCalled)
            assert(onResults.callCount > 1)

            done()
        }

        p.on('exit', onExit)
        p.on('error', onError)
        p.on('results', onResults)
        assert(!p.paused)
        p.pause()
        assert(p.paused)
        setTimeout(() => {
            assert(onExit.notCalled)
            assert(onResults.notCalled)
            assert(p.paused)
            p.resume()
            assert(!p.paused)
        }, 10)
    })

    it('can be paused a bit later after creation', done => {
        const p = createSearch('search')

        const onExit = sinon.spy(
            () => setTimeout(afterExit, 10)
        )

        const onError = sinon.spy()

        const onResults = sinon.spy(result => {
            assert(onExit.notCalled)
            assert(!p.paused)
            p.pause()
            assert(p.paused)

            setTimeout(() => {
                p.kill()
            }, 10)
        })

        const afterExit = () => {
            assert(onExit.calledOnce)
            assert(onResults.calledOnce)
            assert(onError.notCalled)

            done()
        }

        p.on('exit', onExit)
        p.on('error', onError)
        p.on('results', onResults)
    })

    it('can be killed immediately after creation', done => {
        const p = createSearch('search')

        const onError = sinon.spy()
        const onResults = sinon.spy()
        const onExit = sinon.spy(
            () => setTimeout(afterExit, 10)
        )

        const afterExit = () => {
            assert(onExit.calledOnce)
            assert(onExit.args[0][0].terminated)
            assert(onResults.notCalled)
            assert(onError.notCalled)

            done()
        }

        p.on('exit', onExit)
        p.on('error', onError)
        p.on('results', onResults)

        p.kill()
    })

    it('can be killed a bit later after creation', done => {
        const p = createSearch('search')

        const onExit = sinon.spy(
            () => setTimeout(afterExit, 10)
        )

        const onError = sinon.spy()

        const onResults = sinon.spy(result => {
            assert(onExit.notCalled)
            assert(!p.paused)
            p.kill()
        })

        const afterExit = () => {
            assert(onExit.calledOnce)
            assert(onResults.calledOnce)
            assert(onError.notCalled)

            done()
        }

        p.on('exit', onExit)
        p.on('error', onError)
        p.on('results', onResults)
    })
})
