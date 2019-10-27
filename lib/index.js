'use strict';

const Fs = require('fs');
const Path = require('path');
const Hoek = require('@hapi/hoek');
const RequireDir = require('require-directory');

const internals = {};

exports.calls = (instanceName, manifest) => {

    Hoek.assert(typeof instanceName === 'string', 'You must specify a name for the instance.  It will be used to generate meaningful error messages.');

    // Uniqueify
    const dirnames = [...new Set(manifest.map(({ dirname }) => dirname))];

    dirnames.forEach((dirname) => {

        Hoek.assert(internals.isDirectory(dirname), `Directory "${dirname}" does not exist.`);
    });

    return manifest.reduce((collector, bone) => {

        const place = Path.join(bone.dirname, bone.place);

        // Resolve arguments

        let argGroups = internals.tryToRequire(place);
        const dirFiles = (typeof argGroups === 'undefined') && bone.list && internals.isDirectory(place);
        const fullPlace = (typeof argGroups !== 'undefined') ? require.resolve(place) : '';
        const fullPlaces = [];
        const relativePlaces = [];
        const useFilenames = [];

        if (dirFiles) {

            argGroups = [];

            const relativize = (fn) => {

                if (!fn) {
                    return fn;
                }

                if (typeof fn === 'function') {
                    return (path, file) => fn(Path.basename(file, Path.extname(file)), Path.relative(place, path));
                }

                const regex = fn;   // Should be a regex

                Hoek.assert(regex instanceof RegExp, 'Options to `include` and `exclude` options must be either a function or a RegExp.');

                return (path) => regex.test(Path.relative(place, path));
            };

            RequireDir(module, place, {
                recurse: bone.recursive !== false,    // Defaults to true
                exclude: relativize(bone.exclude),
                include: relativize(bone.include),
                visit: (value, path) => {

                    const name = Path.basename(path, Path.extname(path));
                    const relPath = Path.relative(place, path);

                    argGroups.push(value);
                    useFilenames.push(bone.useFilename && ((v) => bone.useFilename(v, name, relPath)));
                    relativePlaces.push(Path.join(bone.place, name));
                    fullPlaces.push(path);
                }
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
                    instanceName,
                    file: dirFiles ? fullPlaces[i] : fullPlace,
                    place: dirFiles ? relativePlaces[i] : bone.place,
                    useFilename: dirFiles ? useFilenames[i] : null,
                    dirFile: dirFiles,
                    method: bone.method,
                    signature: bone.signature,
                    args,
                    list: bone.list,
                    meta: bone.meta
                }))
            );
        }

        return collector.concat({
            instanceName,
            file: fullPlace,
            place: bone.place,
            useFilename: null,
            dirFile: dirFiles,
            method: bone.method,
            signature: bone.signature,
            args: argGroups,
            list: bone.list,
            meta: bone.meta
        });
    }, []);
};

exports.run = async (calls, instance, ...options) => {

    const makeCall = async (call) => {

        let { args } = call;

        if (typeof args === 'function' && !internals.isClass(args) && !call.evaluated) {

            args = await args(instance, ...options);

            if (call.list && !call.dirFile && Array.isArray(args)) {
                const subCalls = args.map((arg) => ({ ...call, args: arg, evaluated: true }));

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

        const methodIsFunc = (typeof call.method === 'function');
        const base = methodIsFunc ? null : call.method.split('.').slice(0, -1).join('.');
        const context = Hoek.reach(instance, base || false);
        const method = methodIsFunc ? call.method : Hoek.reach(instance, call.method);

        Hoek.assert(typeof method === 'function', `"${call.method}" is not a method on the passed ${call.instanceName}.`);

        await internals.callMethod(method, context, appliableArgs, options, call, methodIsFunc);
    };

    for (let i = 0; i < calls.length; ++i) {
        await makeCall(calls[i]);
    }
};

internals.isClass = (func) => (/^\s*class\s/).test(func.toString());

internals.callMethod = async (method, context, appliableArgs, options, call, callAsFunction) => {

    try {
        if (callAsFunction) {
            await method(context, ...options, ...appliableArgs);
        }
        else {
            await method.apply(context, appliableArgs);
        }
    }
    catch (err) {
        throw internals.tagError(err, call, callAsFunction);
    }
};

internals.tagError = (error, call, callAsFunction) => {

    const message = callAsFunction ?
        `Custom "${call.place}" method called by haute using ${call.file}` :
        `${call.instanceName}.${call.method}() called by haute using ${call.file}`;

    error.message = message + (error.message ? `: ${error.message}` : '');

    return error;
};

internals.tryToRequire = (path) => {

    try {
        return require(path);
    }
    catch (err) {
        // Must be an error specifically from trying to require the passed (normalized) path
        // Note that these error messages are of the form "Cannot find module '${path}'".
        // In node v12 this is followed by a "Require stack", which is why we're testing for
        // the module path specifically wrapped in single quotes.
        Hoek.assert(err.code === 'MODULE_NOT_FOUND' && ~err.message.indexOf(`'${path}'`), err);
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
