import ts from 'typescript'
import fs from 'node:fs'
// Transpile only the pure utility dependency graph; never import stores or start APIs.
export function loadTS(file, base = import.meta.url) {
  const url = new URL(file, base)
  const source = fs.readFileSync(url, 'utf8')
  if (url.pathname.endsWith('.json')) return { default: JSON.parse(source) }
  const code = ts.transpileModule(source, {
    // Modern target like the real build — TypeScript's ES5 default turns
    // `[...someSet]` into an empty array, which silently broke Set-based code.
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  const require = path => loadTS(path.endsWith('.json') ? path : `${path}.ts`, url)
  Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
