// unbundle key verified against tsdown 0.22.1 --help output
// $ npx tsdown --help | grep -i unbundle
// => --unbundle    Unbundle mode
import { defineConfig } from 'tsdown'
import preserveDirectives from 'rollup-preserve-directives'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'browser',
  dts: true,
  unbundle: true,
  plugins: [
    preserveDirectives() as any,
  ],
  deps: {
    // Externalize all peer dependencies — consumers provide these at runtime
    neverBundle: [
      'react',
      'react-dom',
      '@clerk/react',
      '@xyflow/react',
      '@tanstack/react-query',
    ],
  },
})
