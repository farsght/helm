/**
 * Type shim for `workflow/next` — the package ships next.d.cts but its
 * `exports` map in package.json doesn't list a `types` entry, so TS can't
 * resolve declarations through the subpath import. Remove this once the
 * upstream `workflow` package fixes its exports map.
 *
 * Upstream: https://github.com/vercel/workflow
 */
declare module "workflow/next" {
  import type { NextConfig } from "next";
  /** Wrap your Next.js config to enable `"use workflow"` / `"use step"` directives. */
  export function withWorkflow(config: NextConfig): NextConfig;
}
