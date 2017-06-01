'use strict';

const Fs = require('fs');
const Path = require('path');
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

            const place = Path.join(dirname, bone.place);

            // Resolve arguments

            let argGroups = internals.tryToRequire(place);
            const fullPlace = (typeof argGroups !== 'undefined') ? require.resolve(place) : '';
            const fullPlaces = []; // When listed in directory

            if (typeof argGroups === 'undefined' && bone.list && internals.isDirectory(place)) {

                argGroups = RequireDir(place);
                argGroups = Object.keys(argGroups).map((name) => {

                    let value = argGroups[name];

                    if (typeof value === 'function' && !internals.isClass(value)) {
                        value = value(instance, options);
                    }

                    if (bone.useFilename) {
                        value = bone.useFilename(name, value);
                    }

                    fullPlaces.push(require.resolve(Path.join(place, name)));

                    return value;
                });
            }
            else if (typeof argGroups === 'function' && !internals.isClass(argGroups)) {
                argGroups = argGroups(instance, options);
            }

            // No arguments to use, skip
            if (typeof argGroups === 'undefined') {
                return;
            }

            // Queue-up the API calls

            if (bone.list) {
                argGroups.forEach((args, i) => {

                    calls.push({
                        file: fullPlaces[i] || fullPlace,
                        method: bone.method,
                        signature: bone.signature,
                        args,
                        async: bone.async
                    });
                });
            }
            else {
                calls.push({
                    file: fullPlace,
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
                        arg = arg.slice(1, -1); // [argName] -> argName
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
                appliableArgs.push((err) => nextCall(err && internals.tagError(err, call)));
            }

            const base = call.method.split('.').slice(0, -1).join('.');
            const context = Hoek.reach(instance, base || false);
            const method = Hoek.reach(instance, call.method);

            Hoek.assert(typeof method === 'function', `"${call.method}" is not a method on the passed instance.`);

            // Isolating the try-catch
            internals.callMethod(method, context, appliableArgs, call);

            if (!call.async) {
                nextCall();
            }

        }, next);
    };
};

internals.isClass = (func) => (/^\s*class\s/).test(func.toString());

internals.callMethod = (method, context, appliableArgs, call) => {

    try {
        method.apply(context, appliableArgs);
    }
    catch (err) {
        throw internals.tagError(err, call);
    }
};

internals.tagError = (error, call) => {

    const message = `instance.${call.method}() called by haute using ${call.file}`;
    error.message = message + (error.message ? ': ' + error.message : '');

    return error;
};

internals.tryToRequire = (path) => {

    try {
        return require(path);
    }
    catch (err) {
        // Must be an error specifically from trying to require the passed (normalized) path
        Hoek.assert(err.code === 'MODULE_NOT_FOUND' && ~err.message.indexOf(path), err);
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
