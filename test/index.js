'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Path = require('path');
const Haute = require('..');
const ClassAsFile = require('./closet/class');
const ClassAsDirItem = require('./closet/list-as-dir-files/class-item');

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

            expect(err.message).to.endWith(':)');
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

    it('calls method without optional, omitted arguments.', (done) => {

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

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.sigTwo).to.equal('valueTwo');
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('calls method with optional but present arguments.', (done) => {

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
            expect(calledWith).to.have.length(3);
            expect(calledWith[0].arg).to.shallow.equal(ClassAsDirItem);
            expect(calledWith[0].length).to.equal(1);
            expect(calledWith[1]).to.equal({ arg: { funcListOne: 'valueOne' }, length: 1 });
            expect(calledWith[2]).to.equal({ arg: { plainListTwo: 'valueTwo' }, length: 1 });
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

                if (value === ClassAsDirItem) {
                    return class extends ClassAsDirItem {
                        static get filename() {

                            return filename;
                        }
                    };
                }

                value.filename = filename;
                return value;
            }
        }];

        Haute(dirname, manifest)(instance, {}, (err) => {

            expect(err).to.not.exist();
            expect(calledWith).to.have.length(3);
            expect(calledWith[0].arg.prototype).to.be.instanceof(ClassAsDirItem);
            expect(calledWith[0].arg.filename).to.equal('class-item');
            expect(calledWith[0].length).to.equal(1);
            expect(calledWith[1]).to.equal({ arg: { funcListOne: 'valueOne', filename: 'func-item' }, length: 1 });
            expect(calledWith[2]).to.equal({ arg: { plainListTwo: 'valueTwo', filename: 'plain-item' }, length: 1 });
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

    it('calls with class argument in non-list.', (done) => {

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

        Haute(dirname, manifest)(instance, options, (err) => {

            expect(err).to.not.exist();
            expect(calledWith.arg).to.shallow.equal(ClassAsFile);
            expect(calledWith.length).to.equal(1);
            done();
        });
    });

    it('throws hard when encountering a syntax error.', (done) => {

        const instance = {
            callThis: () => false
        };

        const manifest = [{
            method: 'callThis',
            place: 'bad-syntax'
        }];

        const haute = Haute(dirname, manifest);

        expect(() => {

            haute(instance, (ignoreErr) => {

                done(new Error('Should not make it here'));
            });
        }).to.throw(SyntaxError, /unexpected token/i);

        done();
    });

    it('throws hard when encountering a module that exists but requires a module that does not exist.', (done) => {

        const instance = {
            callThis: () => false
        };

        const manifest = [{
            method: 'callThis',
            place: 'bad-require'
        }];

        const haute = Haute(dirname, manifest);

        expect(() => {

            haute(instance, (ignoreErr) => {

                done(new Error('Should not make it here'));
            });
        }).to.throw(/Cannot find module/);

        done();
    });

    it('tags sync runtime errors with calling info.', (done) => {

        const instance = {
            callThis: () => {

                throw new Error('Runtime oopsie!');
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'file'
        }];

        const haute = Haute(dirname, manifest);

        expect(() => {

            haute(instance, (ignoreErr) => {

                done(new Error('Should not make it here'));
            });
        }).to.throw(`instance.callThis() called by haute using ${Path.join(dirname, 'file.js')}: Runtime oopsie!`);

        done();
    });

    it('tags async runtime errors with calling info.', (done) => {

        const instance = {
            callThis: (arg, cb) => cb(new Error('Runtime oopsie!'))
        };

        const manifest = [{
            method: 'callThis',
            place: 'file',
            async: true
        }];

        Haute(dirname, manifest)(instance, (err) => {

            expect(err).to.exist();
            expect(err.message).to.equal(`instance.callThis() called by haute using ${Path.join(dirname, 'file.js')}: Runtime oopsie!`);

            done();
        });
    });

    it('tags runtime errors without existing messages.', (done) => {

        const instance = {
            callThis: (arg, cb) => cb(new Error())
        };

        const manifest = [{
            method: 'callThis',
            place: 'file',
            async: true
        }];

        Haute(dirname, manifest)(instance, (err) => {

            expect(err).to.exist();
            expect(err.message).to.equal(`instance.callThis() called by haute using ${Path.join(dirname, 'file.js')}`);

            done();
        });
    });

    it('tags runtime errors with correct path in single list file.', (done) => {

        const instance = {
            callThis: (arg, cb) => cb(new Error())
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-as-file',
            list: true,
            async: true
        }];

        Haute(dirname, manifest)(instance, (err) => {

            expect(err).to.exist();
            expect(err.message).to.startWith(`instance.callThis() called by haute using ${Path.join(dirname, 'list-as-file.js')}`);

            done();
        });
    });

    it('tags runtime errors with correct path in listed directory files.', (done) => {

        const instance = {
            callThis: (filename, cb) => {

                return cb((filename === 'plain-item') ? new Error() : null);
            }
        };

        const manifest = [{
            method: 'callThis',
            place: 'list-as-dir-files',
            list: true,
            async: true,
            useFilename: (filename) => filename
        }];

        Haute(dirname, manifest)(instance, (err) => {

            expect(err).to.exist();
            expect(err.message).to.startWith(`instance.callThis() called by haute using ${Path.join(dirname, 'list-as-dir-files', 'plain-item.js')}`);

            done();
        });
    });
});
