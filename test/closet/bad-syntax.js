'use strict';

module.exports = (instance, options) => {

    // The bad syntax here is intentional
    const badSyntax = 'oops;

    return {
        badSyntax: 'value'
    };
};
