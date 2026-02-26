import { defineConfig } from 'vitest/config';


export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // transformMode: {
        //     web: ['\\.[jt]sx$'],
        // },
        testNamePattern: '',
        coverage: {
            reporter: ['text', 'json', 'html']
        }
    }
});

