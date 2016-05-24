'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Haute = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const internals = {};

describe('Haute', () => {

    const dirname = `${__dirname}/closet`;

    it('throws when provided a bad directory path.', (done) => {

        const badPath = `${__dirname}/bad-path`;
        expect(Haute.bind(null, badPath, [])).to.throw(`Directory "${badPath}" does not exist.`);
        done();
    });

    it('calls with argument from a plain file.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ file: 'value' });
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('processes multiple items in manifest in order.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith).to.equal([
                { arg: { file: 'value' }, length: 1 },
                { arg: { file: 'value' }, length: 1 },
                { arg: { file: 'value' }, length: 1 }
            ]);
            expect(order).to.equal('123');
            done();
        });
    });

    it('calls shallow method, maintaining context.', (done) => {

        const instance = {
            callThis: function (arg) {

                this.context = true;
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(instance.context).to.equal(true);
            done();
        });
    });

    it('calls deep method, maintaining context.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ file: 'value' });
            expect(calledWith.length).to.equal(1);
            expect(instance.deep.context).to.equal(true);
            done();
        });
    });

    it('allows options to be passed optionally.', (done) => {

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

        // No options passed here.........
        Haute(dirname, manifest)(instance, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ file: 'value' });
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('respects method async option.', (done) => {

        const calledWith = {};

        const instance = {
            callThis: function (arg, next) {

                calledWith.arg = arg;
                calledWith.next = next;
                calledWith.length = arguments.length;
                setTimeout(() => {

                    calledWith.waited = true;
                    next();
                }, 1);
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file',
            async: true
        }];

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ file: 'value' });
            expect(calledWith.next).to.be.a.function();
            expect(calledWith.waited).to.equal(true);
            expect(calledWith.length).to.equal(2);
            done();
        });
    });

    it('respects method async option, call passing error.', (done) => {

        const calledWith = {};

        const instance = {
            callThis: function (arg, next) {

                calledWith.arg = arg;
                calledWith.next = next;
                calledWith.length = arguments.length;
                setTimeout(() => {

                    calledWith.waited = true;
                    next(new Error(':)'));
                }, 1);
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file',
            async: true
        }];

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err.message).to.equal(':)');
            expect(calledWith.arg).to.equal({ file: 'value' });
            expect(calledWith.next).to.be.a.function();
            expect(calledWith.waited).to.equal(true);
            expect(calledWith.length).to.equal(2);
            done();
        });
    });

    it('respects method signature option.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.sigOne).to.equal('valueOne');
            expect(calledWith.sigTwo).to.equal('valueTwo');
            expect(calledWith.length).to.equal(2);
            done();
        });
    });

    it('calls with argument from a json file.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ json: 'value' });
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('calls with a list of arguments from a plain file.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith).to.equal([
                { arg: { listOne: 'valueOne' }, length: 1 },
                { arg: { listTwo: 'valueTwo' }, length: 1 }
            ]);
            done();
        });
    });

    it('calls with a list of arguments from multiple directory files.', (done) => {

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

        Haute(dirname, manifest)(instance, options, (err) => {

            expect(err).to.not.exist();
            expect(calledWith).to.equal([
                { arg: { funcListOne: 'valueOne' }, length: 1 },
                { arg: { plainListTwo: 'valueTwo' }, length: 1 }
            ]);
            expect(instance.insideFuncItem).to.equal('instance');
            expect(options.insideFuncItem).to.equal('options');
            done();
        });
    });

    it('respects useFilename option when listing multiple directory files.', (done) => {

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
            useFilename: (filename, value) => {

                value.filename = filename;
                return value;
            }
        }];

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith).to.equal([
                { arg: { funcListOne: 'valueOne', filename: 'func-item' }, length: 1 },
                { arg: { plainListTwo: 'valueTwo', filename: 'plain-item' }, length: 1 }
            ]);
            done();
        });
    });

    it('calls with argument from an index file.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ dirIndex: 'value' });
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('calls with argument from a deep file.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ deeper: 'value' });
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('skips calling with empty arguments.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(called).to.equal(false);
            done();
        });
    });

    it('calls with evaluated function argument in non-list.', (done) => {

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

        Haute(dirname, manifest)(instance, options, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.equal({ func: 'value' });
            expect(calledWith.length).to.equal(1);
            expect(instance.insideFunc).to.equal('instance');
            expect(options.insideFunc).to.equal('options');
            done();
        });
    });

});
