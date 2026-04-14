/**
 * Fetches NCAA women's soccer transfer portal announcements from FieldLevel's public API
 * and writes data/transfer-portal-dataset.js for the static dashboard.
 *
 * API shape discovered from FieldLevel's shipped client (athleteTransferPortalAnnouncementApi).
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'data', 'transfer-portal-dataset.js')

const BASE = 'https://www.fieldlevel.com/api/athleteTransferPortalAnnouncementApi'
const SPORT_ENUM = 'soccerwomen'
const PAGE_SIZE = 50
const REQUEST_HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (compatible; soccer-dashboard/1.0; +https://github.com) node-fetch',
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalizeAnnouncement(raw) {
  const a = raw.Athlete
  const t = raw.Team
  const username = a?.Username ?? ''
  const id = raw.AthleteTransferPortalAnnouncementId
  return {
    id,
    announcementDateUtc: raw.AnnouncementDateUtc ?? null,
    announcementText: raw.AnnouncementText ?? '',
    yearsOfEligibility: raw.YearsOfEligibility ?? null,
    athlete: {
      displayName: a?.DisplayName ?? '',
      firstName: a?.FirstName ?? '',
      lastName: a?.LastName ?? '',
      username,
      city: a?.City ?? '',
      state: a?.State ?? '',
      positions: a?.Positions ?? '',
      highSchoolGraduationYear: a?.HighSchoolGraduationYear ?? null,
      plannedMajor: a?.PlannedCollegeMajor ?? '',
      profileId: a?.ProfileId ?? null,
    },
    priorSchool: t
      ? {
          displayName: t.TeamDisplayName || t.OrganizationName || '',
          division: t.AthleticAssociationEnum?.Label ?? '',
          city: t.City ?? '',
          state: t.State ?? '',
        }
      : null,
    fieldLevelUrl: username
      ? `https://www.fieldlevel.com/app/portal-announcements/${encodeURIComponent(username)}/${SPORT_ENUM}/${id}`
      : `https://www.fieldlevel.com/app/portal-announcements?sportEnum=${SPORT_ENUM}`,
  }
}

async function fetchPage(page) {
  const url = new URL(BASE)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(PAGE_SIZE))
  url.searchParams.set('sportEnum', SPORT_ENUM)

  const res = await fetch(url, { headers: REQUEST_HEADERS })
  if (!res.ok) {
    throw new Error(`FieldLevel API ${res.status} for ${url}`)
  }
  return res.json()
}

async function fetchAll() {
  const announcements = []
  let page = 1
  let totalCount = null

  for (;;) {
    const json = await fetchPage(page)
    const batch = json.AthleteTransferPortalAnnouncements ?? []
    if (totalCount === null) {
      totalCount = json.TotalCountBasedOnCriteria ?? batch.length
    }

    for (const raw of batch) {
      announcements.push(normalizeAnnouncement(raw))
    }

    if (batch.length === 0 || announcements.length >= (totalCount ?? 0)) {
      break
    }
    if (batch.length < PAGE_SIZE) {
      break
    }

    page += 1
    await sleep(250)
  }

  announcements.sort((left, right) => {
    const a = Date.parse(left.announcementDateUtc || '') || 0
    const b = Date.parse(right.announcementDateUtc || '') || 0
    return b - a
  })

  return { announcements, totalCount: totalCount ?? announcements.length }
}

function writeDataset(payload) {
  const json = JSON.stringify(payload, null, 2)
  const file = `window.TRANSFER_PORTAL_DATASET = ${json}\n`
  writeFileSync(OUT, file, 'utf8')
  process.stdout.write(`Wrote ${OUT} (${payload.players.length} players, totalCount ${payload.totalCount})\n`)
}

async function main() {
  const { announcements, totalCount } = await fetchAll()
  const generatedAt = new Date().toISOString()

  writeDataset({
    generatedAt,
    sourceName: 'FieldLevel',
    sourceListUrl: `https://www.fieldlevel.com/app/portal-announcements?sportEnum=${SPORT_ENUM}`,
    apiNote:
      'Data is aggregated from FieldLevel public transfer portal listings for NCAA women’s soccer. Availability and terms are controlled by FieldLevel.',
    sportEnum: SPORT_ENUM,
    totalCount,
    players: announcements,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
