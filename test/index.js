'use strict';

// Load modules

const Path = require('path');
const Lab = require('lab');
const Code = require('code');
const Haute = require('..');
const ClassAsFile = require('./closet/class');
const ClassAsDirItem = require('./closet/list-as-dir-files/class-item');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const internals = {};

describe('Haute', () => {

    const closetDir = `${__dirname}/closet`;
    const using = (dirname, instanceName, manifest) => {

        return async (...args) => {

            const calls = Haute.calls(instanceName, manifest.map((item) => ({ ...item, dirname })));
            await Haute.run(calls, ...args);
        };
    };

    it('throws when provided a bad directory path.', async () => {

        const badPath = `${__dirname}/bad-path`;
        const haute = using(badPath, 'instance', [{}]);

        await expect(haute({})).to.reject(`Directory "${badPath}" does not exist.`);
    });

    it('calls with argument from a plain file.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.arg).to.equal({ file: 'value' });
        expect(calledWith.length).to.equal(1);
    });

    it('processes multiple items in manifest in order.', async () => {

        const calledWith = [];
        let order = '';

        const instance = {
            callThis: function (arg) {

                order += '1';
                calledWith.push({ arg, length: arguments.length });
            },
            callThisToo: function (arg) {

                order += '2';
                calledWith.push({ arg, length: arguments.length });
            },
            callThisThree: function (arg) {

                order += '3';
                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [
            {
                method: 'callThis',
                place: 'file'
            },
            {
                method: 'callThisToo',
                place: 'file'
            },
            {
                method: 'callThisThree',
                place: 'file'
            }
        ];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { file: 'value' }, length: 1 },
            { arg: { file: 'value' }, length: 1 },
            { arg: { file: 'value' }, length: 1 }
        ]);
        expect(order).to.equal('123');
    });

    it('calls shallow method, maintaining context.', async () => {

        const instance = {
            callThis: function (arg) {

                this.context = true;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(instance.context).to.equal(true);
    });

    it('calls deep method, maintaining context.', async () => {

        const calledWith = {};

        const instance = {
            deep: {
                callThis: function (arg) {

                    calledWith.arg = arg;
                    calledWith.length = arguments.length;
                    this.context = true;
                }
            }
        };

        const manifest = [{
            method: 'deep.callThis',
            place: 'file'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.arg).to.equal({ file: 'value' });
        expect(calledWith.length).to.equal(1);
        expect(instance.deep.context).to.equal(true);
    });

    it('allows options to be passed optionally.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        // No options passed
        await using(closetDir, 'instance', manifest)(instance);

        expect(calledWith.arg).to.equal({ file: 'value' });
        expect(calledWith.length).to.equal(1);
    });

    it('awaits async method.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;

                return new Promise((resolve) => {

                    setTimeout(() => {

                        calledWith.waited = true;
                        resolve();
                    }, 1);
                });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.arg).to.equal({ file: 'value' });
        expect(calledWith.waited).to.equal(true);
        expect(calledWith.length).to.equal(1);
    });

    it('awaits async method, call passing error.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;

                return new Promise((resolve, reject) => {

                    setTimeout(() => {

                        calledWith.waited = true;
                        reject(new Error(':)'));
                    }, 1);
                });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        await expect(using(closetDir, 'instance', manifest)(instance, {})).to.reject(/:\)$/);

        expect(calledWith.arg).to.equal({ file: 'value' });
        expect(calledWith.waited).to.equal(true);
        expect(calledWith.length).to.equal(1);
    });

    it('respects method signature option.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (sigOne, sigTwo) {

                calledWith.sigOne = sigOne;
                calledWith.sigTwo = sigTwo;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'signature',
            signature: ['sigOne', 'sigTwo']
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.sigOne).to.equal('valueOne');
        expect(calledWith.sigTwo).to.equal('valueTwo');
        expect(calledWith.length).to.equal(2);
    });

    it('calls method without optional, omitted arguments.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (sigTwo) {

                calledWith.sigTwo = sigTwo;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'signature-opt',
            signature: ['[sigOne]', 'sigTwo']
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.sigTwo).to.equal('valueTwo');
        expect(calledWith.length).to.equal(1);
    });

    it('calls method with optional but present arguments.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (sigOne, sigTwo) {

                calledWith.sigOne = sigOne;
                calledWith.sigTwo = sigTwo;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'signature',
            signature: ['[sigOne]', 'sigTwo']
        }];

        await using(closetDir, 'instance', manifest)(instance);

        expect(calledWith.sigOne).to.equal('valueOne');
        expect(calledWith.sigTwo).to.equal('valueTwo');
        expect(calledWith.length).to.equal(2);
    });

    it('calls with argument from a json file.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'json-file'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.arg).to.equal({ json: 'value' });
        expect(calledWith.length).to.equal(1);
    });

    it('calls with a list of arguments from a plain file.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-as-file',
            list: true
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { listOne: 'valueOne' }, length: 1 },
            { arg: { listTwo: 'valueTwo' }, length: 1 }
        ]);
    });

    it('calls with a list item as argument from a plain file.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-single-as-file',
            list: true
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { listOne: 'valueOne' }, length: 1 }
        ]);
    });

    it('calls with evaluated function argument in list file.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const options = {};

        const manifest = [{
            method: 'callThis',
            place: 'list-func-as-file',
            list: true
        }];

        await using(closetDir, 'instance', manifest)(instance, options);

        expect(instance.insideFunc).to.equal('instance');
        expect(options.insideFunc).to.equal('options');
        expect(calledWith).to.equal([
            { arg: { listOne: 'valueOne' }, length: 1 },
            { arg: { listTwo: 'valueTwo' }, length: 1 }
        ]);
    });

    it('calls with a list of arguments from multiple directory files.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const options = {};

        const manifest = [{
            method: 'callThis',
            place: 'list-as-dir-files',
            list: true
        }];

        await using(closetDir, 'instance', manifest)(instance, options);

        expect(calledWith).to.have.length(3);
        expect(calledWith[0].arg).to.shallow.equal(ClassAsDirItem);
        expect(calledWith[0].length).to.equal(1);
        expect(calledWith[1]).to.equal({ arg: { funcListOne: 'valueOne' }, length: 1 });
        expect(calledWith[2]).to.equal({ arg: { plainListTwo: 'valueTwo' }, length: 1 });
        expect(instance.insideFuncItem).to.equal('instance');
        expect(options.insideFuncItem).to.equal('options');
    });

    it('respects useFilename option when listing multiple directory files.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-as-dir-files',
            list: true,
            useFilename: (value, filename, path) => {

                if (value === ClassAsDirItem) {
                    return class extends ClassAsDirItem {
                        static get filename() {

                            return filename;
                        }
                        static get path() {

                            return path;
                        }
                    };
                }

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.have.length(3);
        expect(calledWith[0].arg.prototype).to.be.instanceof(ClassAsDirItem);
        expect(calledWith[0].arg.filename).to.equal('class-item');
        expect(calledWith[0].arg.path).to.equal('class-item.js');
        expect(calledWith[0].length).to.equal(1);
        expect(calledWith[1]).to.equal({ arg: { funcListOne: 'valueOne', filename: 'func-item', path: 'func-item.js' }, length: 1 });
        expect(calledWith[2]).to.equal({ arg: { plainListTwo: 'valueTwo', filename: 'plain-item', path: 'plain-item.js' }, length: 1 });
    });

    it('calls with argument from an index file.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'dir-index'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.arg).to.equal({ dirIndex: 'value' });
        expect(calledWith.length).to.equal(1);
    });

    it('calls with argument from a deep file.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'deeper/file'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith.arg).to.equal({ deeper: 'value' });
        expect(calledWith.length).to.equal(1);
    });

    it('skips calling with empty arguments.', async () => {

        let called = false;

        const instance = {
            callThis: function (arg) {

                called = true;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'doesnt-exist'
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(called).to.equal(false);
    });

    it('calls with lazily-evaluated function arguments.', async () => {

        let propValue;

        const instance = {
            prop: null,
            setProp: function (lazy) {

                this.prop = lazy;
            },
            seeProp: function (lazy) {

                propValue = lazy;
            }
        };

        const options = {};

        const manifest = [
            {
                method: 'setProp',
                place: 'lazy-func-first'
            },
            {
                method: 'seeProp',
                place: 'lazy-func-second'
            }
        ];

        await using(closetDir, 'instance', manifest)(instance, options);

        expect(propValue).to.equal('lazy');
    });

    it('calls with evaluated function argument in non-list.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const options = {};

        const manifest = [{
            method: 'callThis',
            place: 'func'
        }];

        await using(closetDir, 'instance', manifest)(instance, options);

        expect(calledWith.arg).to.equal({ func: 'value' });
        expect(calledWith.length).to.equal(1);
        expect(instance.insideFunc).to.equal('instance');
        expect(options.insideFunc).to.equal('options');
    });

    it('does not call with evaluated function undefined in non-list.', async () => {

        let called = false;

        const instance = {
            callThis: function (arg) {

                called = true;
            }
        };

        const options = {};

        const manifest = [{
            method: 'callThis',
            place: 'func-empty'
        }];

        await using(closetDir, 'instance', manifest)(instance, options);

        expect(called).to.equal(false);
        expect(instance.insideFunc).to.equal('instance');
        expect(options.insideFunc).to.equal('options');
    });

    it('calls with class argument in non-list.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const options = {};

        const manifest = [{
            method: 'callThis',
            place: 'class'
        }];

        await using(closetDir, 'instance', manifest)(instance, options);

        expect(calledWith.arg).to.shallow.equal(ClassAsFile);
        expect(calledWith.length).to.equal(1);
    });

    it('throws hard when encountering a syntax error.', async () => {

        const instance = {
            callThis: () => false
        };

        const manifest = [{
            method: 'callThis',
            place: 'bad-syntax'
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(SyntaxError, /unexpected token/i);
    });

    it('throws hard when encountering a module that exists but requires a module that does not exist.', async () => {

        const instance = {
            callThis: () => false
        };

        const manifest = [{
            method: 'callThis',
            place: 'bad-require'
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(/Cannot find module/);
    });

    it('tags sync runtime errors with calling info.', async () => {

        const instance = {
            callThis: () => {

                throw new Error('Runtime oopsie!');
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(`instance.callThis() called by haute using ${Path.join(closetDir, 'file.js')}: Runtime oopsie!`);
    });

    it('tags async runtime errors with calling info.', async () => {

        const instance = {
            callThis: async (arg) => {

                await Promise.resolve();

                throw new Error('Runtime oopsie!');
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(`instance.callThis() called by haute using ${Path.join(closetDir, 'file.js')}: Runtime oopsie!`);
    });

    it('tags runtime errors without existing messages.', async () => {

        const instance = {
            callThis: async (arg) => {

                await Promise.resolve();

                throw new Error();
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(`instance.callThis() called by haute using ${Path.join(closetDir, 'file.js')}`);
    });

    it('tags runtime errors with correct path in single list file.', async () => {

        const instance = {
            callThis: async (arg) => {

                await Promise.resolve();

                throw new Error();
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-as-file',
            list: true
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(`instance.callThis() called by haute using ${Path.join(closetDir, 'list-as-file.js')}`);
    });

    it('tags runtime errors with correct path in listed directory files.', async () => {

        const instance = {
            callThis: async (filename) => {

                await Promise.resolve();

                if (filename === 'plain-item') {
                    throw new Error();
                }

                return null;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-as-dir-files',
            list: true,
            useFilename: (value, filename) => filename
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance, {})).to.reject(`instance.callThis() called by haute using ${Path.join(closetDir, 'list-as-dir-files', 'plain-item.js')}`);
    });

    it('calls custom "method" implementation.', async () => {

        const calledWith = {};

        const instance = {
            callThis: function (arg) {

                calledWith.arg = arg;
                calledWith.length = arguments.length;
            }
        };

        const manifest = [{
            method: (inst, { option }, { file }) => {

                return inst.callThis({
                    file: `${file}-${option}`
                });
            },
            place: 'file'
        }];

        await using(closetDir, 'instance', manifest)(instance, { option: 'with-option' });

        expect(calledWith.arg).to.equal({ file: 'value-with-option' });
        expect(calledWith.length).to.equal(1);
    });

    it('tags custom "method" runtime errors with calling info.', async () => {

        const instance = {
            callThis: () => {

                throw new Error('Runtime oopsie!');
            }
        };

        const manifest = [{
            method: (inst, ...args) => inst.callThis(...args),
            place: 'file'
        }];

        const haute = using(closetDir, 'instance', manifest);

        await expect(haute(instance)).to.reject(`Custom "file" method called by haute using ${Path.join(closetDir, 'file.js')}: Runtime oopsie!`);
    });

    it('recurses by default.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { filename: 'item', path: 'item.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'one/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-two', path: 'one/a/item-two.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'one/b/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/item-one.js' }, length: 1 }
        ]);
    });

    it('recurses when configured on.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            recurse: true,
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { filename: 'item', path: 'item.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'one/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-two', path: 'one/a/item-two.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'one/b/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/item-one.js' }, length: 1 }
        ]);
    });

    it('does not recurse when configured off.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            recurse: false,
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { filename: 'item', path: 'item.js' }, length: 1 }
        ]);
    });

    it('can exclude files with a function.', async () => {

        const calledWith = [];
        const excludeArgs = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            recurse: true,
            exclude: (filename, path, ...others) => {

                excludeArgs.push([filename, path, ...others]);

                return path.split(Path.sep).includes('a');
            },
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(excludeArgs).to.equal([
            ['item', 'item.js'],
            ['item-one', 'one/a/item-one.js'],
            ['item-two', 'one/a/item-two.js'],
            ['item-one', 'one/b/item-one.js'],
            ['item-one', 'two/a/item-one.js'],
            ['item-one', 'two/item-one.js']
        ]);

        expect(calledWith).to.equal([
            { arg: { filename: 'item', path: 'item.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'one/b/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/item-one.js' }, length: 1 }
        ]);
    });

    it('can exclude files with a RegExp.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            recurse: true,
            exclude: /-one/,
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { filename: 'item', path: 'item.js' }, length: 1 },
            { arg: { filename: 'item-two', path: 'one/a/item-two.js' }, length: 1 }
        ]);
    });

    it('can include files with a function.', async () => {

        const calledWith = [];
        const excludeArgs = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            recurse: true,
            include: (filename, path, ...others) => {

                excludeArgs.push([filename, path, ...others]);

                return path.split(Path.sep).includes('a');
            },
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(excludeArgs).to.equal([
            ['item', 'item.js'],
            ['item-one', 'one/a/item-one.js'],
            ['item-two', 'one/a/item-two.js'],
            ['item-one', 'one/b/item-one.js'],
            ['item-one', 'two/a/item-one.js'],
            ['item-one', 'two/item-one.js']
        ]);

        expect(calledWith).to.equal([
            { arg: { filename: 'item-one', path: 'one/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-two', path: 'one/a/item-two.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/a/item-one.js' }, length: 1 }
        ]);
    });

    it('can include files with a RegExp.', async () => {

        const calledWith = [];

        const instance = {
            callThis: function (arg) {

                calledWith.push({ arg, length: arguments.length });
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'recurse',
            list: true,
            recurse: true,
            include: /-one/,
            useFilename: (value, filename, path) => {

                value.filename = filename;
                value.path = path;
                return value;
            }
        }];

        await using(closetDir, 'instance', manifest)(instance, {});

        expect(calledWith).to.equal([
            { arg: { filename: 'item-one', path: 'one/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'one/b/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/a/item-one.js' }, length: 1 },
            { arg: { filename: 'item-one', path: 'two/item-one.js' }, length: 1 }
        ]);
    });
});
