import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                'ui/',
                'i18n/',
                'presets/',
                'templates/',
                'docs/',
                '*.config.js',
                'index.js',
                'manifest.json'
            ],
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
        }
    }
});
