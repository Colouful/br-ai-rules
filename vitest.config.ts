import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

export default defineConfig({
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
  },
});
