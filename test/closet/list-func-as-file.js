'use strict';

module.exports = (instance, options) => {

    instance.insideFunc = 'instance';
    options.insideFunc = 'options';

    return [
        {
            listOne: 'valueOne'
        },
        {
            listTwo: 'valueTwo'
        }
    ];
};
