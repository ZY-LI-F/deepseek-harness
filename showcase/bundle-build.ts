/** Bundle out-of-tree browser halves against DSH's shared React/store modules. */
import { defineConfig } from 'tsdown'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

/** Build one Cordis browser factory; type-only feature imports never enter its runtime graph. */
export function browserBundle(id: string) {
  const shared = ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-store']
  const prefix = '\0dsh-inline-css:'
  return defineConfig({
    entry: ['./entry.tsx'], outDir: './lib', format: 'cjs', platform: 'browser', dts: false, sourcemap: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    deps: { neverBundle: shared, alwaysBundle: specifier => !shared.includes(specifier) },
    plugins: [{ name: 'dsh-inline-css', resolveId(source, importer) {
      return source.endsWith('.css?inline') && importer ? `${prefix}${resolve(dirname(importer), source.slice(0, -7))}.mjs` : null
    }, async load(id) { return id.startsWith(prefix) ? `export default ${JSON.stringify(await readFile(id.slice(prefix.length, -4), 'utf8'))};` : null } }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:(require)=>{`,
      intro: 'var module={exports:{}};var exports=module.exports;', footer: 'return module.exports;}});',
    },
  })
}
