const framework = {
    dependencies: {},
    data: {},
    components: {},
    modules: {},
    elements: {}
};

if (!fuzzysort)
    throw new Error('Missing dependency: fuzzysort');

framework.dependencies['fuzzysort'] = fuzzysort;

framework.data['dictionary'] = [
    /* ----- WORD (1) ----- */
    { 
        english: {
            word: 'word in english',
            translation: 'translation in kapampangan',
            pronounciation: '/prəˌnənsēˈāSH(ə)n/',
            type: 'type',
            definition: [
                'definition 1',
                'definition 2'
            ]
        }, // VICE VERSA PALA TO MEDYO A LOT OF WORK? wala pako mahanap na other way eh
        kapampangan: {
            word: 'word in kapampangan',
            translation: 'translation in english',
            pronounciation: '/man-sa-nas/',
            type: 'type',
            definition: 'only one definition' /* CAN BE MULTIPLE DEFINITIONS, REFER ABOVE */
        }
    }, /* IMPROTANT CHARACTER "," LAGI MO LALAGYAN NG "," KAPAG MAY NEXT ITEM, otherwise magkakaroon ng syntax error */
    /* ----- WORD (2) ----- */
    {
        english: {
            word: 'doing',
            translation: 'gagawan',
            pronounciation: '/ˈdo͞oiNG/',
            type: 'noun',
            definition: 'the activities in which a particular person engages.'
        },
        kapampangan: {
            word: 'gagawan',
            translation: 'doing',
            pronounciation: '/ga-ga-wan/',
            type: 'noun',
            definition: 'my fucking definition'
        }
    }
];

framework.data['languages'] = (() => {
    const dictionary = framework.data['dictionary'];

    const languages = { };

    for (const language of Object.keys(dictionary[0])) {
        const words = [];

        for (const _word of dictionary) {
            const word = _word[language];

            if (words.indexOf(word) === -1)
                words.push(word);
        }

        languages[language] = words;
    }

    return languages;
})();

framework.data['language'] = undefined;

framework.components['render'] = (value) => {
    let data = '';

    for (const item of value) {
        const highlight = framework.dependencies['fuzzysort'].highlight(item, '<b>', '</b>');

        data += `
            <li data-word='${item.obj.word}'
                style='cursor: pointer;'>
                ${
                    Math.abs(
                        item.score
                    )
                } - ${
                    highlight
                }
            </li>
        `;
    }

    return data;
};

framework.components['algorithm'] = (() => {
    const floor = (number) =>
        Math.floor(number * 100) / 100;

    return (index, value) => {
        const latency = {
            start: performance.now()
        };
        
        const result =
            framework.dependencies['fuzzysort'].go(value, framework.data['languages'][index], {
                key: 'word'
            });

        latency.end = performance.now();

        return {
            result,
            latency: floor(latency.end - latency.start)
        };
    };
})();

framework.modules['colorize'] = (min = 150, max = 255) => {
    const random = (min, max) =>
        Math.floor(Math.random() * (max - min) + min);

    const color = `rgb(${random(min, max)}, ${random(min, max)}, ${random(min, max)})`;

    return color;
}

framework.modules['popup'] = (value) => {
    const language = framework.data['language'],
        languages = framework.data['languages'];

    const popup = framework.elements['popup'];

    const word = languages[language].find(word => word.word === value);

    popup.innerHTML = `
        <div class='popup' style='background-color: ${framework.modules['colorize']()} !important;'>
            <span class='dictionary-word'>
                ${word.word} (${word.translation})
            </span>
            <span class='dictionary-pronounciation'>
                [ ${word.pronounciation} ]
            </span>
            <div class='popup-separator'></div>
            <span class='dictionary-semantic'>
                ${word.type.toLowerCase()}
            </span>
            <ul class='dictionary-definition' style='list-style-type: decimal;'>
                ${Array.isArray(word.definition)
                    ? word.definition.map((item, index) => {
                        return `<li>${item}</li>` + (index === word.definition.length - 1 ? '' : '<br>');
                    }).join('')
                    : `<li>${word.definition}</li>`
                }
            </ul>
        </div>
    `;

    popup.classList.add('active');
}

framework.modules['display'] = async (value) => {
    const { benchmark, list } = framework.elements,
        language = framework.data['language'];

    const { result, latency } = await framework.components['algorithm'](language, value);

    benchmark.innerHTML = result.length
        ? `${result.length} matches in ${latency}ms`
        : '';

    list.innerHTML = result.length
        ? framework.components['render'](result)
        : '';

    {
        for (const children of list.children) {
            children.addEventListener('click', () => {
                const word = children.dataset['word'];

                framework.modules['popup'](word);
            });
        }
    }
};

framework.modules['hook'] = () => {
    const { bookmark, search, popup } = framework.elements;

    for (const children of bookmark.children) {
        const mark = children.innerHTML.trim().toLowerCase();

        if (children.classList.contains('active'))
            framework.data['language'] = mark;

        children.addEventListener('click', async () => {
            for (const child of bookmark.children)
                child.classList.remove('active');

            children.classList.add('active');

            {
                framework.data['language'] = mark;

                search.placeholder = framework.data['language'];

                await framework.modules['display'](search.value);
            }
        });
    }

    search.addEventListener('input', async () =>
        await framework.modules['display'](search.value));

    popup.addEventListener('click', (event) => {
        if (!event.srcElement.classList.contains('popup-container'))
            return;

        popup.classList.remove('active');

    });
    search.placeholder = framework.data['language'];
};

framework.modules['initialize'] = () => {
    const selectors = [
        [
            '.bookmark',
            'bookmark'
        ],
        [
            '.search-container input',
            'search'
        ],
        [
            '.result-container p',
            'benchmark'
        ],
        [
            '.result-container ul',
            'list'
        ],
        [
            '.popup-container',
            'popup'
        ]
    ];

    return new Promise((resolve, reject) => {
        try {
            for (const [selector, name] of selectors)
                framework.elements[name] =
                    document.querySelector(selector);

            for (const name in framework.elements)
                if (!framework.elements[name])
                    throw new Error(`Missing element: ${name}`);

            framework.modules['hook']();

            resolve();
        } catch (err) {
            reject(err);
        }
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    await framework.modules['initialize']();
});