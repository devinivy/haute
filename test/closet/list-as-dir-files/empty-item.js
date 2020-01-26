'use strict';

module.exports = (instance, options) => {

    instance.insideFuncItem = 'instance';
    options.insideFuncItem = 'options';

    return; // No return value intentional
};
