'use strict';

module.exports = async (instance, options) => {

    await new Promise((resolve) => setTimeout(resolve, 1));

    instance.insideFunc = 'instance';
    options.insideFunc = 'options';

    return [
        {
            listOne: 'valueOne'
        },
        {
            listTwo: 'valueTwo'
        },
        () => ({                    // To ensure function evaluation does not recurse
            listThree: 'valueThree'
        })
    ];
};
