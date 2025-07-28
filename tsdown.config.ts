import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outputOptions: {
    file: 'dist/main.js',
    format: 'cjs',
  },
  copy: {
    from: 'assets',
    to: 'dist',
  },
})
