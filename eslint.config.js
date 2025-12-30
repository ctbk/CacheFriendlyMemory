import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            '.vitest/**',
            'dist/**',
            'vitest.config.js'
        ]
    },
    js.configs.recommended,
    {
        plugins: {
            import: importPlugin
        },
        rules: {
            'import/no-unresolved': ['error', { commonjs: true }],
            'import/named': ['error'],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        },
        settings: {
            'import/resolver': {
                node: {
                    moduleDirectory: ['node_modules', '.']
                }
            },
            'import/core-modules': ['script.js', 'extensions.js']
        },
        languageOptions: {
            globals: {
                console: 'readonly',
                window: 'readonly',
                document: 'readonly',
                jQuery: 'readonly',
                $: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                FileReader: 'readonly',
                structuredClone: 'readonly',
                toastr: 'readonly',
                getContext: 'readonly',
                global: 'readonly'
            }
        }
    }
];
