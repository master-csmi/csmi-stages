import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadSiteConfig } from './generate-site-config.mjs'
import { expectedAttachmentPaths, loadStudents } from './generate-content.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const forbiddenExtensions = new Set(['.csv', '.tsv', '.ods', '.xls', '.xlsx', '.xltx'])

function trackedFiles () {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  return output.toString('utf8').split('\0').filter(Boolean)
}

async function validatePdf (relativePath, maxBytes) {
  const absolutePath = path.join(root, relativePath)
  const info = await stat(absolutePath)
  if (info.size > maxBytes) {
    throw new Error(`${relativePath} dépasse la limite de ${Math.round(maxBytes / 1024 / 1024)} Mio`)
  }
  const signature = (await readFile(absolutePath)).subarray(0, 5).toString('ascii')
  if (signature !== '%PDF-') {
    throw new Error(`${relativePath} porte l'extension .pdf mais n'est pas un PDF`)
  }
}

const config = await loadSiteConfig()
const students = await loadStudents()
const expected = new Set(students.flatMap(expectedAttachmentPaths))
const files = trackedFiles()
const maxBytes = config.maxPdfSizeMiB * 1024 * 1024

for (const relativePath of files) {
  const extension = path.extname(relativePath).toLowerCase()
  if (forbiddenExtensions.has(extension)) {
    throw new Error(`Fichier de données interdit dans Git : ${relativePath}`)
  }
  if (relativePath === 'private' || relativePath.startsWith('private/')) {
    throw new Error(`Le répertoire privé ne doit jamais être versionné : ${relativePath}`)
  }
  if (extension === '.pdf') {
    if (!/^modules\/m[12]\/attachments\/[^/]+\.pdf$/.test(relativePath)) {
      throw new Error(`PDF en dehors d'un répertoire d'attachments autorisé : ${relativePath}`)
    }
    if (!expected.has(relativePath)) {
      throw new Error(`PDF absent du manifeste ou mal nommé : ${relativePath}`)
    }
    await validatePdf(relativePath, maxBytes)
  }
}

const submitted = files.filter((file) => expected.has(file)).length
console.log(`Validation terminée : ${students.length} étudiant(s), ${submitted}/${expected.size} PDF publics déposés.`)
