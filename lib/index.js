'use strict';

const Fs = require('fs');
const Hoek = require('hoek');
const Items = require('items');
const RequireDir = require('require-dir');

const internals = {};

module.exports = (dirname, manifest) => {

    Hoek.assert(internals.isDirectory(dirname), `Directory "${dirname}" does not exist.`);

    // Main routine run on particular instance
    return (instance, options, next) => {

        if (typeof options === 'function') {
            next = options;
            options = {};
        }

        const calls = [];

        manifest.forEach((bone) => {

            const place = `${dirname}/${bone.place}`;

            // Resolve arguments

            let argGroups = internals.tryToRequire(place);

            if (typeof argGroups === 'undefined' && bone.list && internals.isDirectory(place)) {

                argGroups = RequireDir(place);
                argGroups = Object.keys(argGroups).map((name) => {

                    let value = argGroups[name];

                    if (typeof value === 'function' && !/^class\s/.test(Function.prototype.toString.call(value))) {
                        value = value(instance, options);
                    }

                    if (bone.useFilename) {
                        value = bone.useFilename(name, value);
                    }

                    return value;
                });
            }
            else if (typeof value === 'function' && !/^class\s/.test(Function.prototype.toString.call(value))) {
                argGroups = argGroups(instance, options);
            }

            // No arguments to use, skip
            if (typeof argGroups === 'undefined') {
                return;
            }

            // Queue-up the API calls

            if (bone.list) {
                argGroups.forEach((args) => {

                    calls.push({
                        method: bone.method,
                        signature: bone.signature,
                        args: args,
                        async: bone.async
                    });
                });
            }
            else {
                calls.push({
                    method: bone.method,
                    signature: bone.signature,
                    args: argGroups,
                    async: bone.async
                });
            }
        });

        // Run through each API call, sync or async

        Items.serial(calls, (call, nextCall) => {

            let appliableArgs;

            if (call.signature) {

                appliableArgs = call.signature.reduce((collector, arg) => {

                    const optional = /^\[.+\]$/.test(arg);

                    if (optional) {
                        arg = arg.slice(1, -1);
                        if (call.args.hasOwnProperty(arg)) {
                            collector.push(call.args[arg]);
                        }
                    }
                    else {
                        collector.push(call.args[arg]);
                    }

                    return collector;
                }, []);

            }
            else {
                appliableArgs = [call.args];
            }

            if (call.async) {
                appliableArgs.push(nextCall);
            }

            const base = call.method.split('.').slice(0, -1).join('.');
            const bind = Hoek.reach(instance, base || false);
            const method = Hoek.reach(instance, call.method);

            Hoek.assert(typeof method === 'function', `"${call.method}" is not a method on the passed instance.`);

            method.apply(bind, appliableArgs);

            if (!call.async) {
                nextCall();
            }

        }, next);
    };

};

internals.tryToRequire = (path) => {

    try {
        return require(path);
    }
    catch (ignoreErr) {
        return undefined;
    }
};

internals.isDirectory = (path) => {

    try {
        return Fs.statSync(path).isDirectory();
    }
    catch (ignoreErr) {
        return false;
    }
};
