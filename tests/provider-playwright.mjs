// Compatibility entry point. Scenarios now live in tests/e2e/provider-flow.spec.ts
// and are registered with @playwright/test rather than run during module import.
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const cli = resolve(dirname(require.resolve('@playwright/test/package.json')), 'cli.js')
process.argv = [process.execPath, cli, 'test', ...process.argv.slice(2)]
await import(pathToFileURL(cli).href)
