'use strict';

module.exports = (instance, options) => {

    instance.insideFunc = 'instance';
    options.insideFunc = 'options';

    return [
        undefined, // For good measure, to ensure it's a no-op
        {
            listOne: 'valueOne'
        },
        {
            listTwo: 'valueTwo'
        }
    ];
};
