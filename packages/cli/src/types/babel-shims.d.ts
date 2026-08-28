// Ambient declarations for the two @babel/* packages src/utils/strip-types.ts
// imports that ship no types of their own and have no @types package on npm.
//
// @babel/core is typed properly, by the @types/babel__core devDependency —
// only these two need a shim. Both are consumed the same way: imported for
// their default export and handed straight to Babel's `presets` / `plugins`
// options, so `PluginTarget` (what a preset or plugin factory is, from
// @types/babel__core) is the accurate type for each, not `any`.
//
// Without this file, `tsc --noEmit` fails with TS7016 on all three imports,
// and `tsup --dts` does not catch it — tsup only type-checks what it needs
// for the declaration emit, and stripTypes' return type is inferrable
// without resolving these modules. That is why the package's `typecheck`
// script is wired into .github/workflows/cli.yml as its own step.

declare module "@babel/preset-typescript" {
  import type { PluginTarget } from "@babel/core";
  const preset: PluginTarget;
  export default preset;
}

declare module "@babel/plugin-syntax-jsx" {
  import type { PluginTarget } from "@babel/core";
  const plugin: PluginTarget;
  export default plugin;
}
