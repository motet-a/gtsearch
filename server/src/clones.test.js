
const {assert} = require('chai')
const path = require('path')

const createClones = require('./clones')
const {isClonesError, errors: clonesErrors} = createClones
const {fileExists} = require('./util')

describe('clones', () => {
    const clones = createClones('test-clones')
    const basePath = clones._basePath

    it('works', async () => {
        if (await clones.exists('r')) {
            await clones.remove('r')
        }

        assert(!await clones.exists('r'))

        await clones.clone('https://github.com/motet-a/yan.git', 'r')
        assert(await clones.exists('r'))
        assert(await fileExists(path.join(basePath, 'r', 'yan.py')))

        assert(await clones._getCurrentBranch('r') === 'master')

        await(clones.pull('r'))

        await clones.remove('r')
        assert(!await clones.exists('r'))
        assert(!await fileExists(path.join(basePath, 'r', 'yan.py')))
    }).timeout(10 * 1000)

    it('fails with a nonexistent repo', async () => {
        try {
            await clones.clone('https://github.com/motet-a/nonexistent.git', 'r')
        } catch (error) {
            assert(!await clones.exists('nonexistent'))
            assert(isClonesError(error))
            assert(error.code = clonesErrors.AUTH_FAILED)
            return
        }
        assert(false)
    }).timeout(10 * 1000)
})
