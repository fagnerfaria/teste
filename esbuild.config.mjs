import esbuild from 'esbuild';
import { readFile } from 'node:fs/promises';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/*
Agentage Memory — Obsidian plugin
This is a generated bundle. Source lives in src/. Do not edit directly.
*/`;

const prod = process.argv[2] === 'production';

const preventDiff3UndeclaredGlobal = {
  name: 'diff3-0.0.4-undeclared-ed-fix',
  setup(build) {
    // Upstream diff3/onp.js assigns to an undeclared and unused "ed" variable.
    // It works in sloppy CommonJS but crashes in esbuild's strict plugin bundle
    // when a real conflict reaches this branch: ReferenceError: ed is not defined.
    // Remove only that dead assignment while bundling; NEVER modify node_modules.
    build.onLoad({ filter: /[\\/]diff3[\\/]onp\.js$/ }, async (args) => {
      const original = await readFile(args.path, 'utf8');
      const signature = /^[ \t]*ed = delta \+ 2 \* p;[ \t]*$/gm;
      const hits = [...original.matchAll(signature)];
      if (hits.length !== 1) {
        throw new Error(
          'diff3 upstream implementation changed; review its onp.js before bundling. ' +
            'Expected exactly one undeclared ed assignment, found ' +
            hits.length
        );
      }
      const contents = original.replace(
        /^[ \t]*ed = delta \+ 2 \* p;[ \t]*$/m,
        '            // Removed unused implicit-global assignment (diff3 0.0.4).'
      );
      return { contents, loader: 'js' };
    });
  },
};

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ['src/main.ts'],
  plugins: [preventDiff3UndeclaredGlobal],
  bundle: true,
  // Externalize node builtins in BOTH the bare and `node:` form. The desktop-only
  // paths (auth.json/vaults.json under ~/.agentage) load these lazily; mobile never
  // reaches them. Without the `node:`-prefixed entries esbuild leaves the raw
  // specifier and the Obsidian renderer can't resolve it.
  external: ['obsidian', 'electron', ...builtins, ...builtins.map((m) => `node:${m}`)],
  // Browser platform so the bundle is mobile-safe; isomorphic-git + diff3 + js-yaml
  // are pure-JS. A couple of Node globals are shimmed for browser resolution.
  platform: 'browser',
  define: {
    global: 'window',
    'process.env.NODE_ENV': JSON.stringify(prod ? 'production' : 'development'),
  },
  format: 'cjs',
  // Lower lazy `import('node:fs/promises')` to a `require()`: the Obsidian (Electron)
  // renderer CORS-blocks dynamic import of a `node:`/bare specifier (app://obsidian.md
  // origin), but require() works. Keeps desktop auth.json/vaults.json fs access alive.
  supported: { 'dynamic-import': false },
  target: 'es2024',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
