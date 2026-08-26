// Copyright (C) 2026 x0697x
const browserGlobals = {
    AbortController: 'readonly',
    CustomEvent: 'readonly',
    DOMParser: 'readonly',
    MutationObserver: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    clearInterval: 'readonly',
    clearTimeout: 'readonly',
    console: 'readonly',
    document: 'readonly',
    fetch: 'readonly',
    getComputedStyle: 'readonly',
    location: 'readonly',
    localStorage: 'readonly',
    setInterval: 'readonly',
    setTimeout: 'readonly',
    window: 'readonly',
    inventoryModules: 'readonly',
};
const nodeGlobals = {
    AbortController: 'readonly',
    Buffer: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    clearTimeout: 'readonly',
    console: 'readonly',
    process: 'readonly',
    setTimeout: 'readonly',
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
            'src/features/**/tests/**/*.mjs',
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: nodeGlobals,
        },
        rules: commonRules,
    },
];
