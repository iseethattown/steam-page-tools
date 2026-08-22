// Copyright (C) 2026 x0697x
const browserGlobals = {
    DOMParser: 'readonly',
    MutationObserver: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    clearInterval: 'readonly',
    console: 'readonly',
    document: 'readonly',
    fetch: 'readonly',
    getComputedStyle: 'readonly',
    location: 'readonly',
    localStorage: 'readonly',
    setInterval: 'readonly',
    setTimeout: 'readonly',
    window: 'readonly',
};
const nodeGlobals = {
    Buffer: 'readonly',
    URL: 'readonly',
    console: 'readonly',
    process: 'readonly',
};
const commonRules = {
    'eqeqeq': 'error',
    'no-constant-condition': 'error',
    'no-eval': 'error',
    'no-redeclare': 'error',
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': [
        'error',
        {
            args: 'after-used',
            caughtErrors: 'none',
        },
    ],
};

export default [
    {
        ignores: [
            'dist/**',
            'node_modules/**',
        ],
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: browserGlobals,
        },
        rules: commonRules,
    },
    {
        files: [
            'eslint.config.js',
            'scripts/**/*.mjs',
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: nodeGlobals,
        },
        rules: commonRules,
    },
];
