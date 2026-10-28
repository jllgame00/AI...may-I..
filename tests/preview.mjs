// In-process source preview for restricted environments where Vite cannot spawn
// esbuild. This is a browser QA aid, not the production Vite build.
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { createRequire } from 'node:module'
import { rollup } from 'rollup'
import ts from 'typescript'
import { compile } from '@tailwindcss/node'

const root=process.cwd(), require=createRequire(import.meta.url)
const aliases={react:'react/cjs/react.production.js','react/jsx-runtime':'react/cjs/react-jsx-runtime.production.js','react-dom':'react-dom/cjs/react-dom.production.js','react-dom/client':'react-dom/cjs/react-dom-client.production.js',scheduler:'scheduler/cjs/scheduler.production.js'}
const bundle=await rollup({input:resolve(root,'src/main.tsx'),plugins:[{
  name:'qa-typescript-commonjs',
  resolveId(id,importer){
    if(aliases[id])return resolve(root,'node_modules',aliases[id])
    const path=id.startsWith('.')?resolve(dirname(importer),id):id.startsWith('/')?id:require.resolve(id,{paths:[importer?dirname(importer):root]})
    for(const suffix of ['', '.ts','.tsx','.js','.json'])if(existsSync(path+suffix))return path+suffix
    throw new Error(`Unresolved QA import: ${id}`)
  },
  load(id){
    let source=readFileSync(id,'utf8')
    if(id.endsWith('.css'))return ''
    if(id.endsWith('.json'))return `export default ${source}`
    if(/\.tsx?$/.test(id))source=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
    if(!source.includes('exports.')&&!source.includes('module.exports'))return source
    const dependencies=[...new Set([...source.matchAll(/require\(["']([^"']+)["']\)/g)].map(m=>m[1]))]
    const names=[...new Set([...source.matchAll(/exports\.([A-Za-z_$][\w$]*)\s*=/g)].map(m=>m[1]))].filter(n=>n!=='default'&&n!=='__esModule')
    source=source.replace(/require\(["']([^"']+)["']\)/g,(_,name)=>`dependency${dependencies.indexOf(name)}`).replaceAll('process.env.NODE_ENV','"production"')
    return dependencies.map((name,i)=>`import dependency${i} from ${JSON.stringify(name)};`).join('\n')+`\nconst module={exports:{}};((module,exports)=>{\n${source}\n})(module,module.exports);\nexport default module.exports;\n`+names.map(n=>`export const ${n}=module.exports.${n};`).join('\n')
  },
}]})
const {output}=await bundle.generate({format:'es'})
const script=output.find(o=>o.type==='chunk').code
const css=(await compile(readFileSync(resolve(root,'src/styles.css'),'utf8'),{base:root,onDependency:()=>{}})).build([])
createServer((request,response)=>{
  const path=request.url.split('?')[0]
  response.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.css'?'text/css':'text/html; charset=utf-8')
  response.end(path.endsWith('app.js')?script:path.endsWith('app.css')?css:'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI..may I..?</title><link rel="stylesheet" href="app.css"><div id="root"></div><script type="module" src="app.js"></script></html>')
}).listen(4175,'127.0.0.1',()=>console.log('Source QA preview ready at http://127.0.0.1:4175/AI...may-I../ (not a production build)'))
