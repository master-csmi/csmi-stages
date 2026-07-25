import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(root, 'config', 'site.json')

function quote (value) {
  return JSON.stringify(String(value))
}

export async function loadSiteConfig () {
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const year = String(config.year)

  if (year !== 'YYYY' && !/^20\d{2}$/.test(year)) {
    throw new Error(`config/site.json: year doit être "YYYY" ou une année entre 2000 et 2099 (reçu : ${year})`)
  }

  for (const key of ['organization', 'repository', 'siteUrl', 'uiBundleUrl']) {
    if (typeof config[key] !== 'string' || !config[key].trim()) {
      throw new Error(`config/site.json: le champ ${key} est obligatoire`)
    }
  }

  if (!Number.isInteger(config.maxPdfSizeMiB) || config.maxPdfSizeMiB < 1) {
    throw new Error('config/site.json: maxPdfSizeMiB doit être un entier positif')
  }

  return { ...config, year }
}

function renderAntora (config) {
  const repositoryUrl = `https://github.com/${config.organization}/${config.repository}`

  return `# Généré par npm run configure depuis config/site.json. Ne pas modifier directement.
name: ${quote(config.repository)}
title: ${quote(`Master CSMI ${config.year}`)}
version: ~
start_page: ROOT:index.adoc
asciidoc:
  attributes:
    year: ${quote(config.year)}
    repo: ${quote(config.repository)}
    stages-uri: ${quote(repositoryUrl)}
    pr-uri: ${quote(`${repositoryUrl}/compare`)}
    max-pdf-size-mib: ${quote(config.maxPdfSizeMiB)}
nav:
- modules/ROOT/nav.adoc
- modules/m1/nav.adoc
- modules/m2/nav.adoc
`
}

function renderSite (config) {
  return `# Généré par npm run configure depuis config/site.json. Ne pas modifier directement.
site:
  title: ${quote(`Master CSMI · Stages ${config.year}`)}
  url: ${quote(config.siteUrl)}
  start_page: ${quote(`${config.repository}:ROOT:index.adoc`)}
content:
  sources:
  - url: ./
    branches: HEAD
ui:
  bundle:
    url: ${quote(config.uiBundleUrl)}
    snapshot: true
output:
  clean: true
  dir: public
asciidoc:
  attributes:
    year: ${quote(config.year)}
    repo: ${quote(config.repository)}
    stages-uri: ${quote(`https://github.com/${config.organization}/${config.repository}`)}
    pr-uri: ${quote(`https://github.com/${config.organization}/${config.repository}/compare`)}
    max-pdf-size-mib: ${quote(config.maxPdfSizeMiB)}
    hide-uri-scheme: ""
`
}

async function writeOrCheck (relativePath, content, check) {
  const target = path.join(root, relativePath)
  if (check) {
    const current = await readFile(target, 'utf8').catch(() => '')
    if (current !== content) {
      throw new Error(`${relativePath} n'est pas synchronisé avec config/site.json ; exécutez npm run configure`)
    }
    return
  }
  await writeFile(target, content, 'utf8')
}

export async function generateSiteConfig ({ check = false } = {}) {
  const config = await loadSiteConfig()
  await writeOrCheck('antora.yml', renderAntora(config), check)
  await writeOrCheck('site.yml', renderSite(config), check)
  return config
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invokedDirectly) {
  generateSiteConfig({ check: process.argv.includes('--check') })
    .then((config) => console.log(`Configuration ${config.repository} (${config.year}) validée.`))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
