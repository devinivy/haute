'use strict';

module.exports = {};

(() => {
    // We need a way to stash request.extensions['.js'] before it is overwritten
    // by lab, for "type": "module" support, which we test in the test suite. The
    // way lab overwrites it sidesteps the new ERR_REQUIRE_ESM error, and instead
    // we get a syntax error for .js files that are ESM.
    require.extensions['.js.stashed'] = require.extensions['.js'];
})();
