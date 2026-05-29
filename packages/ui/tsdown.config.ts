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
    // Externalize all peer dependencies and their sub-paths — consumers provide these at runtime
    neverBundle: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      '@clerk/react',
      '@xyflow/react',
      '@tanstack/react-query',
      // Externalize UI primitives and utilities — resolved from consumer's node_modules
      'radix-ui',
      'class-variance-authority',
      // Phase 2 additions: externalize new deps used by ported components
      'recharts',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@dnd-kit/modifiers',
      'lucide-react',
      'sonner',
      'next-themes',
      'cmdk',
      'react-day-picker',
      '@radix-ui/react-direction',
      '@radix-ui/react-slot',
    ],
  },
})
