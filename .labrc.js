module.exports = {
    coverage: true,
    threshold: 100,
    lint: true,
    assert: '@hapi/code',
    paths: ['test/index.js'],
    globals: 'FinalizationRegistry,WeakRef'
};
