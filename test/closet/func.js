'use strict';

module.exports = (instance, options) => {

    instance.insideFunc = 'instance';
    options.insideFunc = 'options';

    return {
        func: 'value'
    };
};
