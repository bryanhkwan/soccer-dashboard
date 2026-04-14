/**
 * Lists prior schools from the transfer portal that do not appear to be represented
 * in the soccer dataset team list (by normalized name matching).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeSchoolForMatch(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/women'?s|men'?s/g, '')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\bsoccer\b/g, '')
    .replace(/\bteam\b/g, '')
    .replace(/\bathletics\b/g, '')
    .replace(/\buniversity\b/g, 'u')
    .replace(/\bcollege\b/g, 'col')
    .replace(/\bof\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function schoolCoveredByTeams(priorDisplayName, teams) {
  const priorNorm = normalizeSchoolForMatch(priorDisplayName)
  if (!priorNorm) return false

  for (const team of teams) {
    const tn = normalizeSchoolForMatch(`${team.name || ''} ${team.longName || ''}`)
    if (!tn) continue
    if (priorNorm === tn) return true
    if (priorNorm.length >= 8 && tn.includes(priorNorm)) return true
    if (tn.length >= 8 && priorNorm.includes(tn)) return true
    if (priorNorm.length >= 10 && tn.length >= 10) {
      let common = 0
      const n = Math.min(priorNorm.length, tn.length)
      for (let i = 0; i < n; i++) {
        if (priorNorm[i] === tn[i]) common++
        else break
      }
      if (common >= 10) return true
    }
  }
  return false
}

/** Merge rows often use a short `name` plus `longName`; match those parts against portal strings. */
function schoolCoveredByMerge(priorDisplayName, mergeTeams) {
  const priorNorm = normalizeSchoolForMatch(priorDisplayName)
  if (!priorNorm) return false

  for (const m of mergeTeams) {
    const parts = [
      normalizeSchoolForMatch(m.longName || ''),
      normalizeSchoolForMatch(m.name || ''),
      normalizeSchoolForMatch(`${m.name || ''} ${m.longName || ''}`),
    ].filter(Boolean)

    for (const c of parts) {
      if (priorNorm === c) return true
      if (priorNorm.length >= 8 && c.includes(priorNorm)) return true
      if (c.length >= 8 && priorNorm.includes(c)) return true
    }
  }
  return false
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

function loadMergeTeams() {
  try {
    const raw = readFileSync(join(root, 'scripts', 'merge-teams.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.teams) ? parsed.teams : []
  } catch {
    return []
  }
}

const soccer = loadSoccerDataset()
const tp = loadTransferPortal()
const teams = soccer.teams
const mergeTeams = loadMergeTeams()

const seen = new Map()
for (const entry of tp.players) {
  const s = entry.priorSchool
  if (!s?.displayName) continue
  const key = s.displayName
  if (!seen.has(key)) {
    seen.set(key, {
      displayName: key,
      division: s.division || '',
      city: s.city || '',
      state: s.state || '',
      count: 0,
    })
  }
  seen.get(key).count += 1
}

const missing = []
for (const info of seen.values()) {
  if (schoolCoveredByTeams(info.displayName, teams)) continue
  if (schoolCoveredByMerge(info.displayName, mergeTeams)) continue
  missing.push(info)
}

missing.sort((a, b) => b.count - a.count)

console.log(`Transfer portal unique prior schools: ${seen.size}`)
console.log(`Already in dataset (fuzzy) or in merge-teams: ${seen.size - missing.length}`)
console.log(`Missing from dataset + merge file: ${missing.length}`)
console.log('')
for (const m of missing) {
  console.log(`${m.count}x | ${m.division} | ${m.displayName} | ${m.city}, ${m.state}`)
}
