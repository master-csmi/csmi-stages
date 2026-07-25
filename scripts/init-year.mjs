import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { generateSiteConfig } from './generate-site-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const year = process.argv[2]

if (!/^20\d{2}$/.test(year ?? '')) {
  console.error('Usage : npm run init:year -- 2026')
  process.exit(1)
}

const configPath = path.join(root, 'config', 'site.json')
const config = JSON.parse(await readFile(configPath, 'utf8'))
const repository = `csmi-stages-${year}`

config.year = Number(year)
config.repository = repository
config.siteUrl = `https://${config.organization}.github.io/${repository}`

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
await generateSiteConfig()

console.log(`Le dépôt est configuré pour ${year}.`)
console.log('Étapes suivantes :')
console.log('  1. compléter data/students.yml ;')
console.log('  2. exécuter npm run check ;')
console.log('  3. valider les paramètres GitHub décrits dans README.md.')
