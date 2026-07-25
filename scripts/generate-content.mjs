import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import YAML from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'data', 'students.yml')
const allowedKeys = new Set([
  'level',
  'last_name',
  'first_name',
  'company',
  'company_url',
  'subject',
  'file_stem',
  'report_visibility',
  'report_url',
  'slides_visibility',
  'slides_url'
])

function text (value) {
  return value == null ? '' : String(value).trim()
}

function asciiDocText (value) {
  return text(value).replace(/\s+/g, ' ').replaceAll('|', '\\|')
}

function slugPart (value) {
  return text(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validateUrl (value, label) {
  if (!value) return
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} doit être une URL valide : ${value}`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} doit utiliser http ou https : ${value}`)
  }
}

function normalizeStudent (student, index) {
  if (!student || typeof student !== 'object' || Array.isArray(student)) {
    throw new Error(`students[${index}] doit être un objet`)
  }

  const unknown = Object.keys(student).filter((key) => !allowedKeys.has(key))
  if (unknown.length) {
    throw new Error(`students[${index}] contient des champs interdits ou inconnus : ${unknown.join(', ')}`)
  }

  const level = text(student.level).toLowerCase()
  const lastName = text(student.last_name)
  const firstName = text(student.first_name)
  if (!['m1', 'm2'].includes(level)) {
    throw new Error(`students[${index}].level doit valoir m1 ou m2`)
  }
  if (!lastName || !firstName) {
    throw new Error(`students[${index}] doit contenir last_name et first_name`)
  }

  const fileStem = text(student.file_stem) || `${slugPart(lastName)}-${slugPart(firstName)}`
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(fileStem)) {
    throw new Error(`students[${index}].file_stem n'est pas un nom de fichier sûr : ${fileStem}`)
  }

  const reportVisibility = text(student.report_visibility) || 'public'
  const slidesVisibility = text(student.slides_visibility) || 'public'
  for (const [label, visibility] of [
    ['report_visibility', reportVisibility],
    ['slides_visibility', slidesVisibility]
  ]) {
    if (!['public', 'confidential'].includes(visibility)) {
      throw new Error(`students[${index}].${label} doit valoir public ou confidential`)
    }
  }

  const companyUrl = text(student.company_url)
  const reportUrl = text(student.report_url)
  const slidesUrl = text(student.slides_url)
  validateUrl(companyUrl, `students[${index}].company_url`)
  validateUrl(reportUrl, `students[${index}].report_url`)
  validateUrl(slidesUrl, `students[${index}].slides_url`)
  if (companyUrl && !text(student.company)) {
    throw new Error(`students[${index}].company_url nécessite le champ company`)
  }
  if (reportVisibility === 'confidential' && reportUrl) {
    throw new Error(`students[${index}].report_url est incompatible avec un rapport confidentiel`)
  }
  if (slidesVisibility === 'confidential' && slidesUrl) {
    throw new Error(`students[${index}].slides_url est incompatible avec une présentation confidentielle`)
  }

  return {
    level,
    lastName,
    firstName,
    company: text(student.company),
    companyUrl,
    subject: text(student.subject),
    fileStem,
    reportVisibility,
    reportUrl,
    slidesVisibility,
    slidesUrl
  }
}

export async function loadStudents () {
  const parsed = YAML.parse(await readFile(manifestPath, 'utf8'))
  if (!parsed || !Array.isArray(parsed.students)) {
    throw new Error('data/students.yml doit contenir une clé students associée à une liste')
  }

  const students = parsed.students.map(normalizeStudent)
  const seen = new Map()
  for (const student of students) {
    const key = `${student.level}/${student.fileStem.toLowerCase()}`
    if (seen.has(key)) {
      throw new Error(`Nom de fichier dupliqué : ${student.level}/${student.fileStem}`)
    }
    seen.set(key, true)
  }
  return students
}

export function expectedAttachmentPaths (student) {
  const base = path.posix.join('modules', student.level, 'attachments')
  const result = []
  if (student.reportVisibility === 'public' && !student.reportUrl) {
    result.push(path.posix.join(base, `${student.fileStem}.pdf`))
  }
  if (student.slidesVisibility === 'public' && !student.slidesUrl) {
    result.push(path.posix.join(base, `${student.fileStem}-slides.pdf`))
  }
  return result
}

function companyDisplay (student) {
  if (!student.company) return 'Entreprise à préciser'
  const company = asciiDocText(student.company)
  return student.companyUrl ? `link:${student.companyUrl}[${company}]` : company
}

function documentDisplay (student, kind) {
  const isReport = kind === 'report'
  const label = isReport ? 'Rapport' : 'Présentation'
  const visibility = isReport ? student.reportVisibility : student.slidesVisibility
  const externalUrl = isReport ? student.reportUrl : student.slidesUrl
  const suffix = isReport ? '' : '-slides'
  const filename = `${student.fileStem}${suffix}.pdf`
  const relativePath = path.join('modules', student.level, 'attachments', filename)

  if (visibility === 'confidential') return `${label} confidentiel`
  if (externalUrl) return `link:${externalUrl}[${label}]`
  if (existsSync(path.join(root, relativePath))) {
    return `xref:attachment$${filename}[${label}]`
  }
  return `${label} : \`${filename}\` — à venir`
}

function renderStages (students) {
  const header = '// Généré depuis data/students.yml par npm run generate. Ne pas modifier directement.\n\n'
  if (!students.length) return `${header}_Liste des étudiants à compléter._\n`

  const rows = students.map((student) => {
    const subject = asciiDocText(student.subject) || 'Sujet à préciser'
    return `| ${asciiDocText(student.lastName)} | ${asciiDocText(student.firstName)} | ${companyDisplay(student)} | ${subject}`
  })

  return `${header}[cols="1,1,2,4",options="header"]
|===
| Nom | Prénom | Entreprise | Sujet

${rows.join('\n')}
|===
`
}

function renderReports (students) {
  const header = '// Généré depuis data/students.yml par npm run generate. Ne pas modifier directement.\n\n'
  if (!students.length) return `${header}_Aucun document n’est encore référencé._\n`

  return `${header}${students.map((student) => {
    const subject = asciiDocText(student.subject) || 'Sujet à préciser'
    return `* [[${student.fileStem}]]${asciiDocText(student.lastName)} ${asciiDocText(student.firstName)} — _${subject}_ — ${companyDisplay(student)} — ${documentDisplay(student, 'report')} — ${documentDisplay(student, 'slides')}`
  }).join('\n')}\n`
}

export async function generateContent () {
  const students = await loadStudents()
  for (const level of ['m1', 'm2']) {
    const subset = students
      .filter((student) => student.level === level)
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' }) ||
        a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' }))
    const partials = path.join(root, 'modules', level, 'partials')
    await writeFile(path.join(partials, 'stages.adoc'), renderStages(subset), 'utf8')
    await writeFile(path.join(partials, 'rapports.adoc'), renderReports(subset), 'utf8')
  }
  return students
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invokedDirectly) {
  generateContent()
    .then((students) => console.log(`${students.length} étudiant(s) généré(s).`))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
