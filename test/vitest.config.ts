import { defineConfig } from 'vitest/config';


export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // testTransformMode: {
        
            web: ['\\.[jt]sx$'],
        },
        coverage: {
            reporter: ['text', 'json', 'html']
        }
    }
});

