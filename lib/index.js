'use strict';

const Fs = require('fs');
const Path = require('path');
const Hoek = require('hoek');
const RequireDir = require('require-dir');

const internals = {};

exports.using = (dirname, instanceName, manifest) => {

    Hoek.assert(internals.isDirectory(dirname), `Directory "${dirname}" does not exist.`);
    Hoek.assert(typeof instanceName === 'string', 'You must specify a name for the instance.  It will be used to generate meaningful error messages.');

    return {
        calls() {

            return manifest.reduce((collector, bone) => {

                const place = Path.join(dirname, bone.place);

                // Resolve arguments

                let argGroups = internals.tryToRequire(place);
                const dirFiles = (typeof argGroups === 'undefined') && bone.list && internals.isDirectory(place);
                const fullPlace = (typeof argGroups !== 'undefined') ? require.resolve(place) : '';
                const fullPlaces = [];
                const relativePlaces = [];
                const useFilenames = [];

                if (dirFiles) {

                    const requiredDir = RequireDir(place);

                    argGroups = Object.keys(requiredDir).map((name) => {

                        useFilenames.push(bone.useFilename && ((v) => bone.useFilename(name, v)));
                        relativePlaces.push(Path.join(bone.place, name));
                        fullPlaces.push(require.resolve(Path.join(place, name)));

                        return requiredDir[name];
                    });
                }

                // No arguments to use, skip
                if (typeof argGroups === 'undefined') {
                    return collector;
                }

                // Queue-up the API calls

                if (bone.list && Array.isArray(argGroups)) {
                    return collector.concat(
                        argGroups.map((args, i) => ({
                            file: dirFiles ? fullPlaces[i] : fullPlace,
                            place: dirFiles ? relativePlaces[i] : bone.place,
                            useFilename: dirFiles ? useFilenames[i] : null,
                            dirFile: dirFiles,
                            method: bone.method,
                            signature: bone.signature,
                            args,
                            list: bone.list
                        }))
                    );
                }

                return collector.concat({
                    file: fullPlace,
                    place: bone.place,
                    useFilename: null,
                    dirFile: dirFiles,
                    method: bone.method,
                    signature: bone.signature,
                    args: argGroups,
                    list: bone.list
                });
            }, []);
        },
        async run(calls, instance, ...options) {

            const makeCall = async (call) => {

                let args = call.args;

                if (typeof args === 'function' && !internals.isClass(args) && !call.evaluated) {

                    args = args(instance, ...options);

                    if (call.list && !call.dirFile && Array.isArray(args)) {
                        const subCalls = args.map((arg) => Object.assign({}, call, { args: arg, evaluated: true }));

                        for (let i = 0; i < subCalls.length; ++i) {
                            await makeCall(subCalls[i]);
                        }

                        return;
                    }
                }

                if (call.useFilename) {
                    args = call.useFilename(args);
                }

                if (typeof args === 'undefined') {
                    return;
                }

                let appliableArgs;

                if (call.signature) {

                    appliableArgs = call.signature.reduce((collector, arg) => {

                        const optional = /^\[.+\]$/.test(arg);

                        if (optional) {
                            arg = arg.slice(1, -1); // [argName] -> argName
                            if (args.hasOwnProperty(arg)) {
                                collector.push(args[arg]);
                            }
                        }
                        else {
                            collector.push(args[arg]);
                        }

                        return collector;
                    }, []);

                }
                else {
                    appliableArgs = [args];
                }

                const base = call.method.split('.').slice(0, -1).join('.');
                const context = Hoek.reach(instance, base || false);
                const method = Hoek.reach(instance, call.method);

                Hoek.assert(typeof method === 'function', `"${call.method}" is not a method on the passed ${instanceName}.`);

                await internals.callMethod(method, context, appliableArgs, call, instanceName);
            };

            for (let i = 0; i < calls.length; ++i) {
                await makeCall(calls[i]);
            }
        }
    };
};

internals.isClass = (func) => (/^\s*class\s/).test(func.toString());

internals.callMethod = async (method, context, appliableArgs, call, instanceName) => {

    try {
        await method.apply(context, appliableArgs);
    }
    catch (err) {
        throw internals.tagError(err, call, instanceName);
    }
};

internals.tagError = (error, call, instanceName) => {

    const message = `${instanceName}.${call.method}() called by haute using ${call.file}`;
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
