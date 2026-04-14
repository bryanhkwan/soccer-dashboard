/**
 * Lists transfer portal players that do not match the current soccer dataset roster
 * (same heuristics as app.js).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { runInNewContext } from 'node:vm'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeDisplayName(value) {
  const normalized = normalizeText(value)
  if (!normalized.includes(',')) {
    return normalized
  }
  const [lastName, ...firstParts] = normalized.split(',').map((piece) => normalizeText(piece))
  return normalizeText(`${firstParts.join(' ')} ${lastName}`)
}

function buildRosterNameKey(value) {
  const normalized = normalizeDisplayName(value)
    .replace(/\./g, '')
    .replace(/[''\u2019]/g, '')
  const folded = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return slugify(folded)
}

function normalizeSchoolForMatch(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/women'?s|men'?s/g, '')
    .replace(/\bsoccer\b/g, '')
    .replace(/\bteam\b/g, '')
    .replace(/\bathletics\b/g, '')
    .replace(/\buniversity\b/g, 'u')
    .replace(/\bcollege\b/g, 'col')
    .replace(/\bof\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function schoolMatchScore(priorNorm, teamNorm) {
  if (!priorNorm || !teamNorm) {
    return 0
  }
  if (priorNorm === teamNorm) {
    return 1
  }
  const shorter = priorNorm.length <= teamNorm.length ? priorNorm : teamNorm
  const longer = priorNorm.length > teamNorm.length ? priorNorm : teamNorm
  if (shorter.length >= 8 && longer.includes(shorter)) {
    return 0.92
  }
  if (shorter.length >= 6 && longer.includes(shorter)) {
    return 0.82
  }
  let common = 0
  const n = Math.min(priorNorm.length, teamNorm.length)
  for (let index = 0; index < n; index += 1) {
    if (priorNorm[index] === teamNorm[index]) {
      common += 1
    } else {
      break
    }
  }
  if (common >= 8) {
    return Math.min(0.88, 0.45 + common / (2 * Math.max(priorNorm.length, teamNorm.length)))
  }
  return 0
}

function loadSoccerDataset() {
  const path = join(root, 'data', 'soccer-dataset.js')
  const code = readFileSync(path, 'utf8')
  const sandbox = { window: {} }
  runInNewContext(`${code}\n`, sandbox)
  return sandbox.window.SOCCER_DATASET
}

function loadTransferPortal() {
  const path = join(root, 'data', 'transfer-portal-dataset.js')
  const code = readFileSync(path, 'utf8')
  const sandbox = { window: {} }
  runInNewContext(`${code}\n`, sandbox)
  return sandbox.window.TRANSFER_PORTAL_DATASET
}

function findMatch(entry, players, teamMap) {
  const nameKey = buildRosterNameKey(entry.athlete?.displayName ?? '')
  if (!nameKey) {
    return null
  }
  const priorNorm = normalizeSchoolForMatch(entry.priorSchool?.displayName ?? '')
  const sameName = players.filter((p) => buildRosterNameKey(p.name) === nameKey)
  if (sameName.length === 0) {
    return null
  }
  if (sameName.length === 1) {
    return sameName[0].id
  }
  let best = null
  let bestScore = -1
  for (const player of sameName) {
    const team = teamMap.get(player.teamId)
    const teamNorm = normalizeSchoolForMatch(`${team?.name || ''} ${team?.longName || ''}`)
    const score = schoolMatchScore(priorNorm, teamNorm)
    if (score > bestScore) {
      bestScore = score
      best = player
    }
  }
  if (bestScore >= 0.45 && best) {
    return best.id
  }
  return null
}

const soccer = loadSoccerDataset()
const tp = loadTransferPortal()
const players = soccer.players
const teamMap = new Map(soccer.teams.map((t) => [t.id, t]))

const unlinked = []
const linked = []

for (const entry of tp.players) {
  const id = findMatch(entry, players, teamMap)
  if (id) {
    linked.push({ entry, rosterId: id })
  } else {
    unlinked.push(entry)
  }
}

console.log(`Transfer portal entries: ${tp.players.length}`)
console.log(`Linked to roster: ${linked.length}`)
console.log(`Unlinked: ${unlinked.length}`)
console.log('')
console.log('--- UNLINKED (name | division | prior school) ---')
for (const e of unlinked) {
  const a = e.athlete
  const s = e.priorSchool
  console.log(`${a?.displayName || '?'} | ${s?.division || '?'} | ${s?.displayName || '?'}`)
}
