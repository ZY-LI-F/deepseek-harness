/** Artifact-consumer check. Requires the repository's built public declaration files. */
import ts from 'typescript'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const directories = folder => readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(folder, entry.name))
const folders = directories(join(root, 'packages')).flatMap(directories)
folders.push(...directories(join(root, 'vendor')))
const paths = {}
for (const folder of folders) {
  if (!existsSync(join(folder, 'package.json'))) continue
  const pkg = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'))
  if (pkg.types) paths[pkg.name] = [join(folder, pkg.types)]
  for (const [key, value] of Object.entries(pkg.exports ?? {})) if (typeof value === 'object' && value?.types) paths[`${pkg.name}${key === '.' ? '' : key.slice(1)}`] = [join(folder, value.types)]
}
paths.react = [join(root, 'packages/client/ui-jobs/node_modules/@types/react/index.d.ts')]
paths['react/jsx-runtime'] = [join(root, 'packages/client/ui-jobs/node_modules/@types/react/jsx-runtime.d.ts')]
const packages = ['showcase/generative-ui/native', 'showcase/plugin-controls']
const roots = packages.flatMap(folder => readdirSync(join(root, folder)).filter(file => /\.(tsx|ts)$/.test(file) && !file.startsWith('tsdown')).map(file => join(root, folder, file)))
const program = ts.createProgram(roots, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX, strict: true, allowJs: true, checkJs: false, allowImportingTsExtensions: true,
  skipLibCheck: true, noEmit: true, types: [], paths,
})
const diagnostics = ts.getPreEmitDiagnostics(program)
if (diagnostics.length) {
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n' }))
  process.exitCode = 1
} else console.log('Both browser bundles pass strict public-declaration type checking.')
