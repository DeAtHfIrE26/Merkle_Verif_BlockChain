/**
 * Node decides whether a .js file is ESM or CommonJS from the nearest
 * package.json "type". The root manifest says "module", so without these two
 * markers every file under dist/cjs would be loaded as ESM and `require()`
 * would fail.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

for (const [dir, type] of [
  ['esm', 'module'],
  ['cjs', 'commonjs'],
]) {
  const target = join(distDir, dir);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`);
}

console.log('dist manifests written (esm=module, cjs=commonjs)');
