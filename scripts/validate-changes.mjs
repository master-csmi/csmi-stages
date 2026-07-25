import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const branch = process.env.HEAD_BRANCH || ''
const match = /^(m1|m2)-/i.exec(branch)

if (!match) {
  console.log(`Branche ${branch || '(locale)'} : contrôle de périmètre étudiant non applicable.`)
  process.exit(0)
}

const baseSha = process.env.BASE_SHA
if (!baseSha) {
  throw new Error('BASE_SHA est obligatoire pour contrôler une Pull Request étudiante')
}

const level = match[1].toLowerCase()
const output = execFileSync(
  'git',
  ['diff', '--name-status', '--find-renames', `${baseSha}...HEAD`],
  { cwd: root, encoding: 'utf8' }
)
const changes = output.trim().split('\n').filter(Boolean).map((line) => {
  const [status, ...paths] = line.split('\t')
  return { status, paths }
})

if (!changes.length) throw new Error(`La branche ${branch} ne contient aucune modification`)

for (const change of changes) {
  if (change.status.startsWith('D')) {
    throw new Error(`Une Pull Request étudiante ne peut pas supprimer de fichier : ${change.paths.join(' -> ')}`)
  }
  for (const changedPath of change.paths) {
    const allowed = new RegExp(`^modules/${level}/attachments/[^/]+\\.pdf$`)
    if (!allowed.test(changedPath)) {
      throw new Error(
        `La branche ${branch} doit modifier uniquement les PDF de modules/${level}/attachments/ : ${changedPath}`
      )
    }
  }
}

console.log(`Périmètre étudiant validé : ${changes.length} modification(s) dans les attachments ${level.toUpperCase()}.`)
