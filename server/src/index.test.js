
const {ensureVarDirExists} = require('./util')

before(ensureVarDirExists)

require('./db.test')
require('./clones.test')
require('./ws.test')
require('./search.test')
require('./buffered-search.test')
