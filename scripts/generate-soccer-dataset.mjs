import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { load } from 'cheerio'

const season = '2025'
const divisions = ['d1', 'd2', 'd3']

const requestHeaders = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const cacheDir = new URL('../.cache/soccer/', import.meta.url)

const manualTeamOverrides = {
  'st-francis-pa': {
    id: 'st-francis-pa',
    scoreboardSeo: 'st-francis-pa',
    schoolSlug: 'st-francis-pa',
    name: 'Saint Francis',
    longName: 'Saint Francis University',
    division: 'd1',
    conferenceSeo: 'nec',
    conference: 'Northeast Conference',
    location: 'Loretto, PA',
    domain: 'https://sfuathletics.com',
    logoSlug: 'st-francis-pa',
  },
  'tex-am-commerce': {
    id: 'east-tex-am',
    scoreboardSeo: 'tex-am-commerce',
    schoolSlug: 'east-tex-am',
    name: 'East Tex. A&M',
    longName: 'East Texas A&M University',
    division: 'd1',
    conferenceSeo: 'southland',
    conference: 'Southland Conference',
    location: 'Commerce, TX',
    domain: 'https://lionathletics.com',
    logoSlug: 'east-tex-am',
  },
  mcneese: {
    id: 'mcneese-st',
    scoreboardSeo: 'mcneese',
    schoolSlug: 'mcneese-st',
    name: 'McNeese St.',
    longName: 'McNeese State University',
    division: 'd1',
    conferenceSeo: 'southland',
    conference: 'Southland Conference',
    location: 'Lake Charles, LA',
    domain: 'https://mcneesesports.com',
    logoSlug: 'mcneese-st',
  },
  jamestown: {
    id: 'jamestown',
    scoreboardSeo: 'jamestown',
    schoolSlug: 'jamestown',
    name: 'Jamestown',
    longName: 'University of Jamestown',
    division: 'd2',
    conferenceSeo: 'nsic',
    conference: 'Northern Sun Intercollegiate Conference',
    location: 'Jamestown, ND',
    domain: 'https://jimmiepride.com',
    logoSlug: 'jamestown',
  },
  vanguard: {
    id: 'vanguard',
    scoreboardSeo: 'vanguard',
    schoolSlug: 'vanguard',
    name: 'Vanguard',
    longName: 'Vanguard University',
    division: 'd2',
    conferenceSeo: 'pacwest',
    conference: 'Pacific West Conference',
    location: 'Costa Mesa, CA',
    domain: 'https://vanguardlions.com',
    logoSlug: 'vanguard',
  },
  'point-park': {
    id: 'point-park',
    scoreboardSeo: 'point-park',
    schoolSlug: 'point-park',
    name: 'Point Park',
    longName: 'Point Park University',
    division: 'd2',
    conferenceSeo: 'mec',
    conference: 'Mountain East Conference',
    location: 'Pittsburgh, PA',
    domain: 'https://pointparksports.com',
    logoSlug: 'point-park',
  },
  regent: {
    id: 'regent',
    scoreboardSeo: 'regent',
    schoolSlug: 'regent',
    name: 'Regent',
    longName: 'Regent University',
    division: 'd3',
    conferenceSeo: 'c2c',
    conference: 'Coast-to-Coast Athletic Conference',
    location: 'Virginia Beach, VA',
    domain: 'https://regentroyals.com',
    logoSlug: 'regent',
  },
  muw: {
    id: 'muw',
    scoreboardSeo: 'muw',
    schoolSlug: 'muw',
    name: 'MUW',
    longName: 'Mississippi University for Women',
    division: 'd3',
    conferenceSeo: 'sliac',
    conference: 'St. Louis Intercollegiate Athletic Conference',
    location: 'Columbus, MS',
    domain: 'https://owlsathletics.com',
    logoSlug: 'muw',
  },
  carlow: {
    id: 'carlow',
    scoreboardSeo: 'carlow',
    schoolSlug: 'carlow',
    name: 'Carlow',
    longName: 'Carlow University',
    division: 'd3',
    conferenceSeo: 'amcc',
    conference: 'Allegheny Mountain Collegiate Conference',
    location: 'Pittsburgh, PA',
    domain: 'https://carlow2024.prestosports.com',
    logoSlug: 'carlow',
  },
  'johnson-wales-charlotte': {
    id: 'johnson-wales-charlotte',
    scoreboardSeo: 'johnson-wales-charlotte',
    schoolSlug: 'johnson-wales-charlotte',
    name: 'JWU Charlotte',
    longName: 'Johnson & Wales University Charlotte',
    division: 'd3',
    conferenceSeo: 'c2c',
    conference: 'Coast-to-Coast Athletic Conference',
    location: 'Charlotte, NC',
    domain: 'https://charlotte.jwuathletics.com',
    logoSlug: '',
  },
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeLookupValue(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bstate university of new york\b/g, 'suny')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\bst[.]?\b/g, 'st')
    .replace(/\bmount\b/g, 'mt')
    .replace(/\bfort\b/g, 'ft')
    .replace(/\bint[’']?l\b/g, 'international')
    .replace(/\buniversity of\b/g, '')
    .replace(/\buniversity\b/g, 'u')
    .replace(/\bcollege\b/g, 'col')
    .replace(/\bstate\b/g, 'st')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseNumber(value) {
  const normalized = normalizeText(value)
  if (!normalized || normalized === '-') return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseNullableNumber(value) {
  const normalized = normalizeText(value)
  if (!normalized || normalized === '-') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseMinutes(value) {
  const normalized = normalizeText(value)

  if (!normalized || normalized === '-') {
    return 0
  }

  if (!normalized.includes(':')) {
    return parseNumber(normalized)
  }

  const parts = normalized.split(':').map((piece) => Number(piece))
  if (parts.some((piece) => Number.isNaN(piece))) {
    return 0
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return Math.round(minutes + seconds / 60)
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return Math.round(hours * 60 + minutes + seconds / 60)
  }

  return 0
}

function normalizeClassYear(value) {
  const normalized = normalizeText(value).toLowerCase()

  if (/\bfr\b/.test(normalized) || normalized.includes('fresh')) return 'Fr'
  if (/\bso\b/.test(normalized) || normalized.includes('soph')) return 'So'
  if (/\bjr\b/.test(normalized) || normalized.includes('junior')) return 'Jr'
  if (/\bsr\b/.test(normalized) || normalized.includes('senior')) return 'Sr'
  if (
    normalized.includes('grad') ||
    normalized.includes('graduate') ||
    normalized.includes('fifth') ||
    normalized.includes('5th')
  ) {
    return 'Grad'
  }

  return 'Other'
}

function normalizePositionGroup(value) {
  const normalized = normalizeText(value).toLowerCase()
  const firstPart = normalized.split('/')[0]?.trim() ?? normalized

  if (firstPart.startsWith('goal') || firstPart === 'gk' || firstPart === 'g') return 'GK'
  if (firstPart.startsWith('def') || firstPart === 'd') return 'DEF'
  if (firstPart.startsWith('mid') || firstPart === 'm') return 'MID'
  if (firstPart.startsWith('for') || firstPart === 'f' || firstPart === 'fw') return 'FWD'

  return 'UTIL'
}

function normalizeDisplayName(value) {
  const normalized = normalizeText(value)

  if (!normalized.includes(',')) {
    return normalized
  }

  const [lastName, ...firstParts] = normalized.split(',').map((piece) => normalizeText(piece))
  return normalizeText(`${firstParts.join(' ')} ${lastName}`)
}

function buildNameKey(value) {
  return slugify(
    normalizeDisplayName(value)
      .replace(/\./g, '')
      .replace(/'/g, ''),
  )
}

function isAggregatePlayerLabel(value) {
  const normalized = normalizeDisplayName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  return (
    normalized === 'team' ||
    normalized === 'total' ||
    normalized === 'totals' ||
    normalized === 'opponent' ||
    normalized === 'opponents'
  )
}

function extractPlayerId(value) {
  const normalized = normalizeText(value)
  const match = normalized.match(/\/(\d+)(?:[/?#]|$)/)
  return match?.[1] ?? ''
}

function humanizeDivision(value) {
  if (value === 'd1') return 'Division I'
  if (value === 'd2') return 'Division II'
  if (value === 'd3') return 'Division III'
  if (value === 'naia') return 'NAIA'
  return String(value ?? '').toUpperCase()
}

function humanizeConferenceSeo(value) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return 'Independent / Unlisted'
  }

  const overrides = {
    acc: 'Atlantic Coast Conference',
    amcc: 'Allegheny Mountain Collegiate Conference',
    c2c: 'Coast-to-Coast Athletic Conference',
    caa: 'Coastal Athletic Association',
    cusa: 'Conference USA',
    mac: 'Mid-American Conference',
    maac: 'Metro Atlantic Athletic Conference',
    mec: 'Mountain East Conference',
    mvc: 'Missouri Valley Conference',
    nec: 'Northeast Conference',
    nsic: 'Northern Sun Intercollegiate Conference',
    pacwest: 'Pacific West Conference',
    sec: 'Southeastern Conference',
    sliac: 'St. Louis Intercollegiate Athletic Conference',
    socon: 'Southern Conference',
    swac: 'Southwestern Athletic Conference',
    wac: 'Western Athletic Conference',
    wcc: 'West Coast Conference',
  }

  const key = normalized.replace(/[^a-z0-9]+/g, '')
  if (overrides[key]) {
    return overrides[key]
  }

  return normalized
    .split('-')
    .map((piece) => piece.toUpperCase())
    .join(' ')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const mergeTeamsConfigUrl = new URL('./merge-teams.json', import.meta.url)

async function loadMergeTeams() {
  try {
    const raw = await readFile(mergeTeamsConfigUrl, 'utf8')
    const parsed = JSON.parse(raw)
    const teams = Array.isArray(parsed.teams) ? parsed.teams : []
    const required = [
      'scoreboardSeo',
      'id',
      'schoolSlug',
      'name',
      'longName',
      'division',
      'conferenceSeo',
      'conference',
      'location',
      'domain',
    ]

    for (const team of teams) {
      for (const key of required) {
        if (team[key] === undefined || team[key] === '') {
          throw new Error(`merge-teams.json: missing "${key}" for scoreboardSeo "${team.scoreboardSeo ?? '?'}"`)
        }
      }
    }

    return teams
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

function buildTeamOverridesFromMerge(mergeTeams) {
  return Object.fromEntries(mergeTeams.map((entry) => [entry.scoreboardSeo, entry]))
}

function buildActiveTeamsWithMerge(discovered, mergeTeams) {
  const bySeo = new Map(discovered.map((team) => [team.scoreboardSeo, team]))

  for (const entry of mergeTeams) {
    if (!entry?.scoreboardSeo || bySeo.has(entry.scoreboardSeo)) {
      continue
    }

    bySeo.set(entry.scoreboardSeo, {
      scoreboardSeo: entry.scoreboardSeo,
      shortName: entry.name,
      fullName: entry.longName,
      division: entry.division,
      conferenceSeo: entry.conferenceSeo,
    })
  }

  return [...bySeo.values()]
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function getCachePath(url) {
  const hash = createHash('sha1').update(url).digest('hex')
  return new URL(`${hash}.json`, cacheDir)
}

async function fetchTextCached(url) {
  await mkdir(cacheDir, { recursive: true })
  const cachePath = getCachePath(url)

  try {
    const cached = JSON.parse(await readFile(cachePath, 'utf8'))
    return cached
  } catch {}

  let payload

  try {
    const response = await fetch(url, {
      headers: requestHeaders,
      redirect: 'follow',
    })

    payload = {
      status: response.status,
      url: response.url,
      text: await response.text(),
      contentType: response.headers.get('content-type') ?? '',
    }
  } catch (error) {
    payload = {
      status: 0,
      url,
      text: '',
      contentType: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  await writeFile(cachePath, JSON.stringify(payload))
  return payload
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: requestHeaders })
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }
  return response.json()
}

async function fetchJsonMaybe(url) {
  const response = await fetch(url, { headers: requestHeaders })
  if (!response.ok) {
    return null
  }
  return response.json()
}

function resolveUrl(baseUrl, value) {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return ''
  }
}

function buildSchoolLookups(rawSchools) {
  const bySlug = new Map(rawSchools.map((school) => [school.slug, school]))
  const byLookup = new Map()

  for (const school of rawSchools) {
    const keys = unique([
      normalizeLookupValue(school.slug.replace(/-/g, ' ')),
      normalizeLookupValue(school.name),
      normalizeLookupValue(school.long_name),
    ])

    for (const key of keys) {
      if (!byLookup.has(key)) {
        byLookup.set(key, [])
      }

      byLookup.get(key).push(school)
    }
  }

  return { bySlug, byLookup }
}

async function fetchConferenceMaps() {
  const conferenceMaps = {}

  for (const division of divisions) {
    const response = await fetchTextCached(`https://www.ncaa.com/standings/soccer-women/${division}`)
    const $ = load(response.text)
    const conferenceMap = {}

    $('#edit-conference option').each((_, element) => {
      const value = normalizeText($(element).attr('value') ?? '')
      const text = normalizeText($(element).text())

      if (!value || value === 'all-conf') {
        return
      }

      conferenceMap[value] = text
    })

    conferenceMaps[division] = conferenceMap
  }

  return conferenceMaps
}

async function fetchActiveTeams() {
  const teams = new Map()

  for (const division of divisions) {
    process.stdout.write(`Discovering ${humanizeDivision(division)} team pool...\n`)
    const schedule = await fetchJson(
      `https://ncaa-api.henrygd.me/schedule-alt/soccer-women/${division}/${season}`,
    )

    for (const dateEntry of schedule?.data?.schedules?.games ?? []) {
      const [month, day, year] = dateEntry.contestDate.split('/')
      const board = await fetchJsonMaybe(
        `https://ncaa-api.henrygd.me/scoreboard/soccer-women/${division}/${year}/${month}/${day}`,
      )

      for (const wrapper of board?.games ?? []) {
        const game = wrapper.game ?? wrapper

        for (const side of ['home', 'away']) {
          const team = game?.[side]
          const seo = normalizeText(team?.names?.seo ?? '')

          if (!seo || seo === 'tba') {
            continue
          }

          const existing = teams.get(seo)
          const nextValue = {
            scoreboardSeo: seo,
            shortName: normalizeText(team?.names?.short ?? existing?.shortName ?? ''),
            fullName: normalizeText(team?.names?.full ?? existing?.fullName ?? ''),
            division,
            conferenceSeo: normalizeText(
              team?.conferences?.[0]?.conferenceSeo ?? existing?.conferenceSeo ?? '',
            ),
          }

          teams.set(seo, existing ? { ...existing, ...nextValue } : nextValue)
        }
      }

      await sleep(15)
    }
  }

  return [...teams.values()].sort((left, right) =>
    left.shortName.localeCompare(right.shortName),
  )
}

function parseSchoolPage(html, schoolSlug) {
  if (!html.includes('class="school-page"')) {
    return null
  }

  const $ = load(html)
  const name = normalizeText($('h1.school-name').first().text())
  const divisionLocation = normalizeText($('.division-location').first().text())
  const divisionMatch = divisionLocation.match(/Division\s+(III|II|I)/i)
  const divisionRoman = divisionMatch?.[1]?.toUpperCase() ?? ''
  const division =
    divisionRoman === 'I'
      ? 'd1'
      : divisionRoman === 'II'
        ? 'd2'
        : divisionRoman === 'III'
          ? 'd3'
          : ''

  const conference = $('dt')
    .filter((_, element) => normalizeText($(element).text()) === 'Conference')
    .next('dd')
    .first()
    .text()

  return {
    name,
    division,
    divisionLabel: division ? humanizeDivision(division) : '',
    location: divisionLocation.replace(/^Division\s+[IVX]+\s*-\s*/i, ''),
    conference: normalizeText(conference),
    athleticsUrl: $('.school-links a[href^="http"]').first().attr('href') ?? '',
    logoUrl:
      $('.school-logo img').first().attr('src') ??
      `https://ncaa-api.henrygd.me/logo/${schoolSlug}.svg?dark=true`,
  }
}

function hasWomenSoccerSignal(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) {
    return false
  }

  return (
    /\bwomens?\s+soccer\b/.test(normalized) ||
    /\bwomen['’]?s\s+soccer\b/.test(normalized) ||
    /\bwsoc\b/.test(normalized) ||
    normalized.includes('soccer')
  )
}

function isLikelyWomenSoccerPage(html, url = '') {
  if (/\/msoc\/|[?&](?:path|sport)=msoc\b/i.test(url)) {
    return false
  }

  const $ = load(html)
  const signals = [
    url,
    $('title').first().text(),
    $('h1').first().text(),
    $('meta[property="og:title"]').attr('content') ?? '',
    $('meta[name="description"]').attr('content') ?? '',
    $('meta[property="og:description"]').attr('content') ?? '',
    $('body').attr('class') ?? '',
  ]

  const primarySignal = signals.some((value) => hasWomenSoccerSignal(value))
  if (primarySignal) {
    const titleAndHeadings = normalizeText(signals.join(' ')).toLowerCase()
    if (/\bmen['’]?s\s+soccer\b|\bmens?\s+soccer\b/.test(titleAndHeadings)) {
      return false
    }

    return true
  }

  const scripts = $('script')
    .map((_, element) => $(element).html() ?? '')
    .get()
    .join(' ')

  return hasWomenSoccerSignal(scripts)
}

function buildRosterPlayer(team, sourceId, values) {
  const displayName = normalizeDisplayName(values.name)
  const rosterUrl = values.rosterPath ? resolveUrl(team.domain, values.rosterPath) : ''
  const nameKey = buildNameKey(displayName)
  const playerKey = sourceId || nameKey

  return [
    playerKey,
    {
      sourceId,
      nameKey,
      id: `${team.id}-${playerKey}`,
      teamId: team.id,
      teamName: team.name,
      division: team.division,
      divisionLabel: team.divisionLabel,
      conference: team.conference,
      conferenceSeo: team.conferenceSeo,
      teamLogoUrl: team.logoUrl,
      teamSiteUrl: team.domain,
      teamRosterUrl: team.rosterUrl ?? '',
      teamStatsUrl: team.statsUrl ?? '',
      name: displayName,
      slug: slugify(displayName),
      rosterUrl,
      position: values.position || 'N/A',
      positionGroup: normalizePositionGroup(values.position || 'N/A'),
      classYear: values.classYear || 'N/A',
      classYearShort: normalizeClassYear(values.classYear ?? ''),
      hometown: values.hometown || 'N/A',
      highSchool: values.highSchool || 'N/A',
      height: values.height || 'N/A',
      jersey: values.jersey || 'N/A',
    },
  ]
}

function parseLegacyRoster(html, team) {
  const $ = load(html)
  const players = new Map()

  $('li.sidearm-roster-player[data-player-id]').each((_, element) => {
    const row = $(element)
    const playerId = normalizeText(row.attr('data-player-id') ?? '')
    const name = normalizeText(row.find('.sidearm-roster-player-name a').first().text())

    if (!playerId || !name || isAggregatePlayerLabel(name)) {
      return
    }

    const academicYears = row
      .find('.sidearm-roster-player-academic-year')
      .map((__, year) => normalizeText($(year).text()))
      .get()
      .filter(Boolean)
      .sort((left, right) => right.length - left.length)

    const hometowns = row
      .find('.sidearm-roster-player-hometown')
      .map((__, hometown) => normalizeText($(hometown).text()))
      .get()
      .filter(Boolean)

    const schools = row
      .find('.sidearm-roster-player-highschool')
      .map((__, school) => normalizeText($(school).text()))
      .get()
      .filter(Boolean)

    const longPosition =
      normalizeText(
        row
          .find('.sidearm-roster-player-position-long-short.hide-on-small-down')
          .first()
          .text(),
      ) ||
      normalizeText(row.find('.sidearm-roster-player-position-long-short').first().text())

    const shortPosition = normalizeText(
      row.find('.sidearm-roster-player-position-long-short.hide-on-medium').first().text(),
    )

    const rosterPath =
      row.attr('data-player-url') ??
      row.find('.sidearm-roster-player-name a').first().attr('href') ??
      ''

    const [playerKey, player] = buildRosterPlayer(team, playerId, {
      name,
      rosterPath,
      position: shortPosition || longPosition || 'N/A',
      classYear: academicYears[0] ?? 'N/A',
      hometown: hometowns[0] ?? 'N/A',
      highSchool: schools[0] ?? 'N/A',
      height: normalizeText(row.find('.sidearm-roster-player-height').first().text()) || 'N/A',
      jersey:
        normalizeText(row.find('.sidearm-roster-player-jersey-number').first().text()) ||
        'N/A',
    })

    players.set(playerKey, player)
  })

  return players
}

function parseTableRoster(html, team) {
  const $ = load(html)
  const players = new Map()

  $('table').each((_, element) => {
    const table = $(element)
    const headers = table
      .find('thead th')
      .map((__, header) => normalizeText($(header).text()))
      .get()
      .filter(Boolean)

    const normalizedHeaders = headers.map((header) =>
      header.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    )

    if (!normalizedHeaders.includes('name')) {
      return
    }

    if (
      normalizedHeaders.includes('title') &&
      normalizedHeaders.includes('email') &&
      normalizedHeaders.includes('phonenumber')
    ) {
      return
    }

    if (
      !normalizedHeaders.some((header) =>
        ['pos', 'position', 'class', 'cl', 'hometownhighschool', 'ht', 'height'].includes(
          header,
        ),
      )
    ) {
      return
    }

    const getColumn = (...candidates) =>
      normalizedHeaders.findIndex((header) => candidates.includes(header))

    const jerseyIndex = getColumn('no')
    const nameIndex = getColumn('name')
    const positionIndex = getColumn('pos', 'position')
    const classIndex = getColumn('class', 'cl', 'yr', 'year')
    const heightIndex = getColumn('ht', 'height')
    const hometownIndex = normalizedHeaders.findIndex((header) =>
      header.startsWith('hometown'),
    )

    table.find('tbody tr').each((__, rowElement) => {
      const cells = $(rowElement).find('td')
      const nameCell = nameIndex >= 0 ? cells.eq(nameIndex) : null
      const name = normalizeText(nameCell?.text() ?? '')

      if (!name || isAggregatePlayerLabel(name)) {
        return
      }

      const rosterPath = nameCell?.find('a').first().attr('href') ?? ''
      const sourceId = extractPlayerId(rosterPath)
      const hometownValue = normalizeText(cells.eq(hometownIndex).text())
      const [hometown = 'N/A', highSchool = 'N/A'] = hometownValue
        ? hometownValue.split(/\s+\/\s+/)
        : []

      const [playerKey, player] = buildRosterPlayer(team, sourceId, {
        name,
        rosterPath,
        position: normalizeText(cells.eq(positionIndex).text()) || 'N/A',
        classYear: normalizeText(cells.eq(classIndex).text()) || 'N/A',
        hometown,
        highSchool,
        height: normalizeText(cells.eq(heightIndex).text()) || 'N/A',
        jersey: normalizeText(cells.eq(jerseyIndex).text()) || 'N/A',
      })

      players.set(playerKey, player)
    })
  })

  return players
}

function parseRoster(html, team) {
  const legacyPlayers = parseLegacyRoster(html, team)
  return legacyPlayers.size > 0 ? legacyPlayers : parseTableRoster(html, team)
}

function buildStatRecord(sourceId, rawName, cells, extras = {}) {
  const displayName = normalizeDisplayName(rawName)
  const nameKey = buildNameKey(displayName)
  const playerKey = sourceId || nameKey

  return [
    playerKey,
    {
      primaryKey: playerKey,
      sourceId,
      name: displayName,
      nameKey,
      cells,
      ...extras,
    },
  ]
}

function indexStatRecord(statsMap, statRecord) {
  statsMap.set(`primary:${statRecord.primaryKey}`, statRecord)
  if (statRecord.sourceId) statsMap.set(`id:${statRecord.sourceId}`, statRecord)
  if (statRecord.nameKey) statsMap.set(`name:${statRecord.nameKey}`, statRecord)
}

function parseLegacyStatsTable($, captionText) {
  const table = $('table')
    .filter((_, element) => normalizeText($(element).find('caption').text()) === captionText)
    .first()

  const rows = new Map()
  if (!table.length) {
    return rows
  }

  table.find('tbody tr').each((_, element) => {
    const row = $(element)
    const playerAnchor = row.find('[data-player-id]').first()
    const playerId = normalizeText(playerAnchor.attr('data-player-id') ?? '')
    const name = normalizeText(playerAnchor.text())

    if (!playerId || isAggregatePlayerLabel(name)) {
      return
    }

    const cells = {}
    row.find('td[data-label]').each((__, cell) => {
      const label = normalizeText($(cell).attr('data-label') ?? '')
      const value = normalizeText($(cell).text())
      if (label && label !== 'BIO') {
        cells[label] = value
      }
    })

    const [, statRecord] = buildStatRecord(playerId, name, cells)
    indexStatRecord(rows, statRecord)
  })

  return rows
}

function extractNuxtPayload(html) {
  const marker = 'id="__NUXT_DATA__">'
  const start = html.indexOf(marker)

  if (start === -1) return null

  const jsonStart = start + marker.length
  const end = html.indexOf('</script>', jsonStart)
  if (end === -1) return null

  return html.slice(jsonStart, end)
}

function hydrateNuxtPayload(rawPayload) {
  const raw = JSON.parse(rawPayload)
  const cache = new Map()

  function hydrateByIndex(index) {
    if (cache.has(index)) {
      return cache.get(index)
    }

    const node = raw[index]
    cache.set(index, null)
    const hydrated = hydrateNode(node)
    cache.set(index, hydrated)
    return hydrated
  }

  function hydrateNode(node) {
    if (typeof node === 'number') return hydrateByIndex(node)
    if (!node || typeof node !== 'object') return node

    if (Array.isArray(node)) {
      if (node[0] === 'Reactive' || node[0] === 'ShallowReactive') {
        return hydrateNode(node[1])
      }

      if (node[0] === 'Set') {
        return node.slice(1).map(hydrateNode)
      }

      return node.map(hydrateNode)
    }

    const hydrated = {}
    for (const [key, value] of Object.entries(node)) {
      hydrated[key] = hydrateNode(value)
    }

    return hydrated
  }

  return hydrateByIndex(0)
}

function parseNuxtStats(html) {
  const payload = extractNuxtPayload(html)

  if (!payload) {
    return {
      offensiveStats: new Map(),
      goalkeepingStats: new Map(),
    }
  }

  const hydrated = hydrateNuxtPayload(payload)
  const cumulativeStats = Object.values(
    hydrated?.pinia?.statsSeason?.cumulativeStats ?? {},
  )[0]
  const overallStats = cumulativeStats?.overallIndividualStats
  const offensiveStats = new Map()
  const goalkeepingStats = new Map()

  for (const row of overallStats?.individualOffensiveStats ?? []) {
    const rawName = normalizeText(row.playerName ?? row.nameFromStats ?? '')
    if (!rawName || isAggregatePlayerLabel(rawName)) {
      continue
    }

    const sourceId =
      normalizeText(String(row.playerRosterBioId ?? '')) || extractPlayerId(row.playerUrl ?? '')

    const [playerKey, statRecord] = buildStatRecord(sourceId, rawName, {
      GP: row.gamesPlayed,
      GS: row.gamesStarted,
      MIN: row.minutesPlayed,
      G: row.goals,
      A: row.assists,
      PTS: row.points,
      SH: row.shots,
      'SH%': row.shotPercentage,
      SOG: row.shotsOnGoal,
      'SOG%': row.shotsOnGoalPercentage,
      'YC-RC': row.yellowCardsRedCards,
      GW: row.gameWinners,
      'PG-PA': row.penaltyKicksAndAttempts,
    })

    indexStatRecord(offensiveStats, statRecord)
  }

  for (const row of overallStats?.goalieStats ?? []) {
    const rawName = normalizeText(row.playerName ?? row.nameFromStats ?? '')
    if (!rawName || isAggregatePlayerLabel(rawName)) {
      continue
    }

    const sourceId =
      normalizeText(String(row.playerRosterBioId ?? '')) || extractPlayerId(row.playerUrl ?? '')

    const [playerKey, statRecord] = buildStatRecord(
      sourceId,
      rawName,
      {
        GP: row.gamesPlayed,
        GS: row.gamesStarted,
        MIN: row.minutesPlayed,
        GA: row.goalsAllowed,
        GAA: row.goalsAgainstAverage,
        SV: row.saves,
        'SV%': row.savesPercentage,
        W: row.wins,
        L: row.losses,
        T: row.ties,
        SHO: row.shutouts,
        SF: row.shotsFaced,
      },
      {
        rosterPath: row.playerUrl ?? '',
      },
    )

    indexStatRecord(goalkeepingStats, statRecord)
  }

  return {
    offensiveStats,
    goalkeepingStats,
  }
}

function getTableHeaders(table, $) {
  const headings = table
    .find('thead th')
    .map((_, header) => normalizeText($(header).text()))
    .get()

  if (headings.length > 0) {
    return headings
  }

  return table
    .find('tr')
    .first()
    .find('th, td')
    .map((_, cell) => normalizeText($(cell).text()))
    .get()
}

function mapStatsCells(rawCells) {
  const cells = {}
  const aliasMap = {
    gp: 'GP',
    games: 'GP',
    gamesplayed: 'GP',
    gs: 'GS',
    gamesstarted: 'GS',
    starts: 'GS',
    min: 'MIN',
    minutes: 'MIN',
    minutesplayed: 'MIN',
    g: 'G',
    goals: 'G',
    a: 'A',
    assists: 'A',
    pts: 'PTS',
    points: 'PTS',
    sh: 'SH',
    shots: 'SH',
    sog: 'SOG',
    shotsongoal: 'SOG',
    shotpercentage: 'SH%',
    shpct: 'SH%',
    shotsongoalpercentage: 'SOG%',
    sogpct: 'SOG%',
    gw: 'GW',
    gamewinners: 'GW',
    gamewinninggoals: 'GW',
    ga: 'GA',
    goalsagainst: 'GA',
    gaa: 'GAA',
    sv: 'SV',
    saves: 'SV',
    svpct: 'SV%',
    savepct: 'SV%',
    savepercentage: 'SV%',
    w: 'W',
    wins: 'W',
    l: 'L',
    losses: 'L',
    t: 'T',
    ties: 'T',
    sho: 'SHO',
    shutouts: 'SHO',
    sf: 'SF',
    shotsfaced: 'SF',
    yellowcards: 'YC',
    redcards: 'RC',
    penaltykicks: 'PG',
    penaltykickgoals: 'PG',
    penaltykickattempts: 'PA',
  }

  for (const [key, value] of Object.entries(rawCells)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '')

    if (normalizedKey === 'gpgs' || normalizedKey === 'gamesplayedgamesstarted') {
      const [games = '0', starts = '0'] = normalizeText(value).split('-')
      cells.GP = games
      cells.GS = starts
      continue
    }

    if (normalizedKey === 'gapts' || normalizedKey === 'goalsassistspoints') {
      const [goals = '0', assists = '0', points = '0'] = normalizeText(value).split('-')
      cells.G = goals
      cells.A = assists
      cells.PTS = points
      continue
    }

    if (normalizedKey === 'wlt') {
      const [wins = '0', losses = '0', ties = '0'] = normalizeText(value).split('-')
      cells.W = wins
      cells.L = losses
      cells.T = ties
      continue
    }

    if (normalizedKey === 'ycrc') {
      cells['YC-RC'] = value
      continue
    }

    if (normalizedKey === 'pgpa' || normalizedKey === 'pkpkatt') {
      cells['PG-PA'] = value
      continue
    }

    const mappedKey = aliasMap[normalizedKey]
    if (mappedKey) {
      cells[mappedKey] = value
    }
  }

  if (cells.YC || cells.RC) {
    cells['YC-RC'] = `${cells.YC ?? '0'}-${cells.RC ?? '0'}`
  }

  if (cells.PG || cells.PA) {
    cells['PG-PA'] = `${cells.PG ?? '0'}-${cells.PA ?? '0'}`
  }

  return cells
}

function parseGenericStats(html) {
  const $ = load(html)
  const offensiveStats = new Map()
  const goalkeepingStats = new Map()

  $('table').each((_, element) => {
    const table = $(element)
    const headers = getTableHeaders(table, $)
    const normalizedHeaders = headers.map((header) =>
      header.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    )
    const nameIndex = normalizedHeaders.findIndex((header) =>
      ['name', 'player', 'studentathlete'].includes(header),
    )

    if (nameIndex === -1) {
      return
    }

    const tableContext = normalizeText(
      [
        table.find('caption').first().text(),
        table.prevAll('h1, h2, h3, h4').first().text(),
      ].join(' '),
    ).toLowerCase()

    table.find('tbody tr').each((__, rowElement) => {
      const cells = $(rowElement).find('td')
      if (!cells.length) {
        return
      }

      const nameCell = cells.eq(nameIndex)
      const rawName = normalizeText(nameCell.text())

      if (!rawName || isAggregatePlayerLabel(rawName)) {
        return
      }

      const rawCells = {}
      headers.forEach((header, index) => {
        rawCells[header] = normalizeText(cells.eq(index).text())
      })

      const standardCells = mapStatsCells(rawCells)
      const sourceId = extractPlayerId(nameCell.find('a').first().attr('href') ?? '')
      const rosterPath = nameCell.find('a').first().attr('href') ?? ''
      const isGoalkeeperTable =
        tableContext.includes('goal') ||
        'SV' in standardCells ||
        'GAA' in standardCells ||
        'GA' in standardCells
      const hasOffensiveData =
        'G' in standardCells ||
        'A' in standardCells ||
        'PTS' in standardCells ||
        'SH' in standardCells ||
        'SOG' in standardCells

      if (!isGoalkeeperTable && !hasOffensiveData) {
        return
      }

      const [, statRecord] = buildStatRecord(
        sourceId,
        rawName,
        standardCells,
        rosterPath ? { rosterPath } : {},
      )

      if (isGoalkeeperTable) {
        indexStatRecord(goalkeepingStats, statRecord)
      } else {
        indexStatRecord(offensiveStats, statRecord)
      }
    })
  })

  return {
    offensiveStats,
    goalkeepingStats,
  }
}

function parseStats(html) {
  const $ = load(html)
  const offensiveStats = parseLegacyStatsTable($, 'Individual Overall Offensive Statistics')
  const goalkeepingStats = parseLegacyStatsTable($, 'Individual Overall Goalkeeping Statistics')

  if (offensiveStats.size > 0 || goalkeepingStats.size > 0) {
    return { offensiveStats, goalkeepingStats }
  }

  const nuxtStats = parseNuxtStats(html)
  if (nuxtStats.offensiveStats.size > 0 || nuxtStats.goalkeepingStats.size > 0) {
    return nuxtStats
  }

  return parseGenericStats(html)
}

function buildFieldStats(source) {
  const yellowRed = normalizeText(source['YC-RC'] ?? '0-0').split('-')
  const penalty = normalizeText(source['PG-PA'] ?? '0-0').split('-')

  return {
    games: parseNumber(source.GP ?? '0'),
    starts: parseNumber(source.GS ?? '0'),
    minutes: parseMinutes(source.MIN ?? '0'),
    minutesRaw: normalizeText(source.MIN ?? '0'),
    goals: parseNumber(source.G ?? '0'),
    assists: parseNumber(source.A ?? '0'),
    points: parseNumber(source.PTS ?? '0'),
    shots: parseNumber(source.SH ?? '0'),
    shotPct: parseNullableNumber(source['SH%'] ?? ''),
    shotsOnGoal: parseNumber(source.SOG ?? '0'),
    shotsOnGoalPct: parseNullableNumber(source['SOG%'] ?? ''),
    yellowCards: parseNumber(yellowRed[0] ?? '0'),
    redCards: parseNumber(yellowRed[1] ?? '0'),
    gameWinners: parseNumber(source.GW ?? '0'),
    penaltyGoals: parseNumber(penalty[0] ?? '0'),
    penaltyAttempts: parseNumber(penalty[1] ?? '0'),
  }
}

function buildGoalkeepingStats(source) {
  return {
    games: parseNumber(source.GP ?? '0'),
    starts: parseNumber(source.GS ?? '0'),
    minutes: parseMinutes(source.MIN ?? '0'),
    minutesRaw: normalizeText(source.MIN ?? '0'),
    goalsAgainst: parseNumber(source.GA ?? '0'),
    goalsAgainstAverage: parseNullableNumber(source.GAA ?? ''),
    saves: parseNumber(source.SV ?? '0'),
    savePct: parseNullableNumber(source['SV%'] ?? ''),
    wins: parseNumber(source.W ?? '0'),
    losses: parseNumber(source.L ?? '0'),
    ties: parseNumber(source.T ?? '0'),
    shutouts: parseNumber(source.SHO ?? '0'),
    shotsFaced: parseNumber(source.SF ?? '0'),
  }
}

function emptyFieldStats() {
  return {
    games: 0,
    starts: 0,
    minutes: 0,
    minutesRaw: '0',
    goals: 0,
    assists: 0,
    points: 0,
    shots: 0,
    shotPct: null,
    shotsOnGoal: 0,
    shotsOnGoalPct: null,
    yellowCards: 0,
    redCards: 0,
    gameWinners: 0,
    penaltyGoals: 0,
    penaltyAttempts: 0,
  }
}

function buildDefaultCandidates(team) {
  const sportPaths = unique(['womens-soccer', 'wsoc', 'soccer', 'sc', ...(team.sportPaths ?? [])])
  const rosterCandidates = []
  const statsCandidates = []

  for (const sportPath of sportPaths) {
    rosterCandidates.push(
      `/sports/${sportPath}/roster/${season}`,
      `/sports/${sportPath}/roster`,
      `/sports/${sportPath}/${season}-26/roster`,
      `/sports/${sportPath}/2025-26/roster`,
      `/roster.aspx?path=${sportPath}`,
    )

    statsCandidates.push(
      `/sports/${sportPath}/stats/${season}`,
      `/sports/${sportPath}/stats`,
      `/sports/${sportPath}/${season}-26/overall`,
      `/sports/${sportPath}/2025-26/overall`,
      `/sports/${sportPath}/${season}-26/team`,
      `/sports/${sportPath}/2025-26/team`,
      `/sports/${sportPath}/${season}-26/stats`,
      `/sports/${sportPath}/2025-26/stats`,
      `/stats.aspx?path=${sportPath}`,
    )
  }

  return {
    rosterCandidates: unique(rosterCandidates.map((value) => resolveUrl(team.domain, value))),
    statsCandidates: unique(statsCandidates.map((value) => resolveUrl(team.domain, value))),
  }
}

function deriveSportRoot(url) {
  return url
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '')
    .replace(
      /\/(roster|stats|schedule|news|story|headlines|archive|index|team|overall|standings)(\/.*)?$/i,
      '',
    )
}

function extractSportLinks(html, baseUrl) {
  const $ = load(html)
  const links = new Set()

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? ''
    const text = normalizeText($(element).text())
    const combined = `${href} ${text}`.toLowerCase()

    if (!hasWomenSoccerSignal(combined)) {
      return
    }

    const absolute = resolveUrl(baseUrl, href)
    if (absolute) {
      links.add(absolute)
    }
  })

  return [...links]
}

function buildCandidatesFromLinks(links) {
  const rosterCandidates = new Set()
  const statsCandidates = new Set()

  for (const link of links) {
    if (/roster/i.test(link)) {
      rosterCandidates.add(link)
    }

    if (/stats|overall|team/i.test(link)) {
      statsCandidates.add(link)
    }

    const sportRoot = deriveSportRoot(link)
    if (!sportRoot) {
      continue
    }

    rosterCandidates.add(`${sportRoot}/roster`)
    rosterCandidates.add(`${sportRoot}/roster/${season}`)
    rosterCandidates.add(`${sportRoot}/2025-26/roster`)
    statsCandidates.add(`${sportRoot}/stats`)
    statsCandidates.add(`${sportRoot}/stats/${season}`)
    statsCandidates.add(`${sportRoot}/2025-26/stats`)
    statsCandidates.add(`${sportRoot}/2025-26/overall`)
    statsCandidates.add(`${sportRoot}/2025-26/team`)
  }

  return {
    rosterCandidates: [...rosterCandidates],
    statsCandidates: [...statsCandidates],
  }
}

async function fetchFirstParsedPage(candidates, parseFn) {
  for (const candidate of unique(candidates)) {
    const response = await fetchTextCached(candidate)
    if (response.status !== 200 || !response.text || /just a moment/i.test(response.text)) {
      continue
    }

    try {
      const parsed = parseFn(response.text, response.url)
      if (parsed) {
        return {
          url: response.url,
          html: response.text,
          parsed,
        }
      }
    } catch {
      continue
    }
  }

  return null
}

async function discoverTeamPages(team) {
  const defaults = buildDefaultCandidates(team)
  let rosterPage = await fetchFirstParsedPage(defaults.rosterCandidates, (html, url) => {
    if (!isLikelyWomenSoccerPage(html, url)) {
      return null
    }

    const players = parseRoster(html, team)
    return players.size > 0 ? players : null
  })

  let statsPage = await fetchFirstParsedPage(defaults.statsCandidates, (html, url) => {
    if (!isLikelyWomenSoccerPage(html, url)) {
      return null
    }

    const stats = parseStats(html)
    return stats.offensiveStats.size > 0 || stats.goalkeepingStats.size > 0 ? stats : null
  })

  if (rosterPage && statsPage) {
    return { rosterPage, statsPage }
  }

  const homePage = await fetchTextCached(team.domain)
  const homeLinks = homePage.status === 200 ? extractSportLinks(homePage.text, team.domain) : []
  const homeCandidates = buildCandidatesFromLinks(homeLinks)

  if (!rosterPage) {
    rosterPage = await fetchFirstParsedPage(homeCandidates.rosterCandidates, (html, url) => {
      if (!isLikelyWomenSoccerPage(html, url)) {
        return null
      }

      const players = parseRoster(html, team)
      return players.size > 0 ? players : null
    })
  }

  if (!statsPage) {
    const rosterLinks = rosterPage?.html ? extractSportLinks(rosterPage.html, team.domain) : []
    const rosterCandidates = buildCandidatesFromLinks(rosterLinks)
    statsPage = await fetchFirstParsedPage(
      unique([...homeCandidates.statsCandidates, ...rosterCandidates.statsCandidates]),
      (html, url) => {
        if (!isLikelyWomenSoccerPage(html, url)) {
          return null
        }

        const stats = parseStats(html)
        return stats.offensiveStats.size > 0 || stats.goalkeepingStats.size > 0 ? stats : null
      },
    )
  }

  return { rosterPage, statsPage }
}

function resolveSchoolSlug(activeTeam, lookups, teamOverrides) {
  const manualOverride = teamOverrides[activeTeam.scoreboardSeo]
  if (manualOverride?.schoolSlug) {
    return manualOverride.schoolSlug
  }

  if (lookups.bySlug.has(activeTeam.scoreboardSeo)) {
    return activeTeam.scoreboardSeo
  }

  const candidates = unique([
    ...(lookups.byLookup.get(normalizeLookupValue(activeTeam.shortName)) ?? []).map(
      (school) => school.slug,
    ),
    ...(lookups.byLookup.get(normalizeLookupValue(activeTeam.fullName)) ?? []).map(
      (school) => school.slug,
    ),
    ...(lookups.byLookup.get(normalizeLookupValue(activeTeam.scoreboardSeo.replace(/-/g, ' '))) ??
      []
    ).map((school) => school.slug),
  ])

  return candidates.length === 1 ? candidates[0] : ''
}

async function hydrateTeam(activeTeam, lookups, conferenceMaps, teamOverrides) {
  const manualOverride = teamOverrides[activeTeam.scoreboardSeo]

  if (manualOverride) {
    const fromCode = Boolean(manualTeamOverrides[activeTeam.scoreboardSeo])
    return {
      id: manualOverride.id,
      scoreboardSeo: activeTeam.scoreboardSeo,
      schoolSlug: manualOverride.schoolSlug,
      name: manualOverride.name,
      longName: manualOverride.longName,
      division: manualOverride.division,
      divisionLabel: manualOverride.divisionLabel ?? humanizeDivision(manualOverride.division),
      conferenceSeo: manualOverride.conferenceSeo,
      conference:
        manualOverride.conference ||
        conferenceMaps[manualOverride.division]?.[manualOverride.conferenceSeo] ||
        humanizeConferenceSeo(manualOverride.conferenceSeo),
      location: manualOverride.location,
      domain: manualOverride.domain,
      schoolPageUrl: manualOverride.schoolSlug
        ? `https://www.ncaa.com/schools/${manualOverride.schoolSlug}`
        : '',
      logoUrl: manualOverride.logoSlug
        ? `https://ncaa-api.henrygd.me/logo/${manualOverride.logoSlug}.svg?dark=true`
        : '',
      sportPaths: manualOverride.sportPaths ?? [],
      sourceType: fromCode ? 'manual' : 'merge-list',
    }
  }

  const schoolSlug = resolveSchoolSlug(activeTeam, lookups, teamOverrides)
  if (!schoolSlug) {
    return null
  }

  const schoolResponse = await fetchTextCached(`https://www.ncaa.com/schools/${schoolSlug}`)
  const schoolInfo = parseSchoolPage(schoolResponse.text, schoolSlug)

  if (!schoolInfo || !schoolInfo.athleticsUrl) {
    return null
  }

  const school = lookups.bySlug.get(schoolSlug)
  const conference =
    schoolInfo.conference ||
    conferenceMaps[schoolInfo.division || activeTeam.division]?.[activeTeam.conferenceSeo] ||
    humanizeConferenceSeo(activeTeam.conferenceSeo)

  return {
    id: schoolSlug,
    scoreboardSeo: activeTeam.scoreboardSeo,
    schoolSlug,
    name: schoolInfo.name || school?.name || activeTeam.shortName,
    longName: school?.long_name || schoolInfo.name || activeTeam.shortName,
    division: schoolInfo.division || activeTeam.division,
    divisionLabel: schoolInfo.divisionLabel || humanizeDivision(activeTeam.division),
    conferenceSeo: activeTeam.conferenceSeo,
    conference,
    location: schoolInfo.location,
    domain: schoolInfo.athleticsUrl,
    schoolPageUrl: `https://www.ncaa.com/schools/${schoolSlug}`,
    logoUrl:
      schoolInfo.logoUrl ||
      `https://ncaa-api.henrygd.me/logo/${schoolSlug}.svg?dark=true`,
    sportPaths: [],
    sourceType: 'school-page',
  }
}

async function buildTeamDataset(team) {
  const { rosterPage, statsPage } = await discoverTeamPages(team)
  const rosterPlayers = rosterPage?.parsed ?? new Map()
  const statsBundle = statsPage?.parsed ?? {
    offensiveStats: new Map(),
    goalkeepingStats: new Map(),
  }
  const { offensiveStats, goalkeepingStats } = statsBundle
  const offensiveRecords = [...new Set(offensiveStats.values())]
  const goalkeepingRecords = [...new Set(goalkeepingStats.values())]
  const rosterById = new Map()
  const rosterByName = new Map()

  for (const [playerKey, player] of rosterPlayers) {
    if (player.sourceId) {
      rosterById.set(player.sourceId, playerKey)
    }

    rosterByName.set(player.nameKey, playerKey)
  }

  const findRosterKey = (record) =>
    rosterById.get(record.sourceId) ?? rosterByName.get(record.nameKey) ?? null
  const getStatRecord = (statsMap, player) =>
    statsMap.get(`id:${player.sourceId}`) ?? statsMap.get(`name:${player.nameKey}`) ?? null

  for (const statLine of offensiveRecords) {
    if (isAggregatePlayerLabel(statLine.name)) {
      continue
    }

    if (findRosterKey(statLine)) {
      continue
    }

    const [playerKey, player] = buildRosterPlayer(team, statLine.sourceId, {
      name: statLine.name,
      position: 'N/A',
      classYear: 'N/A',
      hometown: 'N/A',
      highSchool: 'N/A',
      height: 'N/A',
      jersey: 'N/A',
      rosterPath: statLine.rosterPath ?? '',
    })

    rosterPlayers.set(playerKey, player)
    if (player.sourceId) {
      rosterById.set(player.sourceId, playerKey)
    }

    rosterByName.set(player.nameKey, playerKey)
  }

  for (const statLine of goalkeepingRecords) {
    if (isAggregatePlayerLabel(statLine.name)) {
      continue
    }

    if (findRosterKey(statLine)) {
      continue
    }

    const [playerKey, player] = buildRosterPlayer(team, statLine.sourceId, {
      name: statLine.name,
      position: 'GK',
      classYear: 'N/A',
      hometown: 'N/A',
      highSchool: 'N/A',
      height: 'N/A',
      jersey: 'N/A',
      rosterPath: statLine.rosterPath ?? '',
    })

    rosterPlayers.set(playerKey, player)
    if (player.sourceId) {
      rosterById.set(player.sourceId, playerKey)
    }

    rosterByName.set(player.nameKey, playerKey)
  }

  const players = [...rosterPlayers.entries()]
    .map(([playerId, player]) => {
      const offensive = getStatRecord(offensiveStats, player)
      const goalkeeping = getStatRecord(goalkeepingStats, player)
      const fieldStats = offensive ? buildFieldStats(offensive.cells) : emptyFieldStats()
      const goalkeeperStats = goalkeeping ? buildGoalkeepingStats(goalkeeping.cells) : null
      const hasSeasonStats = fieldStats.games > 0 || (goalkeeperStats?.games ?? 0) > 0

      return {
        ...player,
        teamRosterUrl: rosterPage?.url ?? '',
        teamStatsUrl: statsPage?.url ?? '',
        position: player.position === 'N/A' && goalkeeperStats ? 'GK' : player.position,
        positionGroup:
          player.positionGroup === 'UTIL' && goalkeeperStats ? 'GK' : player.positionGroup,
        hasSeasonStats,
        offensiveStats: fieldStats,
        goalkeepingStats: goalkeeperStats,
      }
    })
    .map(({ sourceId, nameKey, ...player }) => player)
    .filter((player) => !isAggregatePlayerLabel(player.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  return {
    team: {
      id: team.id,
      scoreboardSeo: team.scoreboardSeo,
      schoolSlug: team.schoolSlug,
      name: team.name,
      longName: team.longName,
      division: team.division,
      divisionLabel: team.divisionLabel,
      conference: team.conference,
      conferenceSeo: team.conferenceSeo,
      location: team.location,
      domain: team.domain,
      schoolPageUrl: team.schoolPageUrl,
      logoUrl: team.logoUrl,
      rosterUrl: rosterPage?.url ?? '',
      statsUrl: statsPage?.url ?? '',
      playerCount: players.length,
      playersWithStats: players.filter((player) => player.hasSeasonStats).length,
      sourceType: team.sourceType,
      unresolved: !rosterPage && !statsPage,
    },
    players,
  }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runner() {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) {
        return
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runner()),
  )

  return results
}

async function main() {
  const mergeTeams = await loadMergeTeams()
  const mergeOverrideMap = buildTeamOverridesFromMerge(mergeTeams)
  const teamOverrides = { ...mergeOverrideMap, ...manualTeamOverrides }

  if (mergeTeams.length > 0) {
    process.stdout.write(`Loaded ${mergeTeams.length} team(s) from merge-teams.json (code manualTeamOverrides win on duplicate scoreboardSeo).\n`)
  }

  const [rawSchools, conferenceMaps, discoveredTeams] = await Promise.all([
    fetchJson('https://www.ncaa.com/json/schools'),
    fetchConferenceMaps(),
    fetchActiveTeams(),
  ])

  const activeTeams = buildActiveTeamsWithMerge(discoveredTeams, mergeTeams)

  const lookups = buildSchoolLookups(rawSchools)
  const hydratedTeams = (
    await runPool(activeTeams, 12, async (activeTeam, index) => {
      const result = await hydrateTeam(activeTeam, lookups, conferenceMaps, teamOverrides)
      if ((index + 1) % 100 === 0) {
        process.stdout.write(`Resolved ${index + 1} / ${activeTeams.length} teams...\n`)
      }
      return result
    })
  ).filter(Boolean)

  const builtTeams = []
  const builtPlayers = []
  const failedTeams = []

  const results = await runPool(hydratedTeams, 10, async (team, index) => {
    try {
      const result = await buildTeamDataset(team)
      process.stdout.write(
        `[${index + 1}/${hydratedTeams.length}] ${team.name}: ${result.team.playerCount} players\n`,
      )
      return result
    } catch (error) {
      process.stdout.write(`[${index + 1}/${hydratedTeams.length}] ${team.name}: failed\n`)
      failedTeams.push({
        id: team.id,
        name: team.name,
        message: error instanceof Error ? error.message : String(error),
      })
      return {
        team: {
          id: team.id,
          scoreboardSeo: team.scoreboardSeo,
          schoolSlug: team.schoolSlug,
          name: team.name,
          longName: team.longName,
          division: team.division,
          divisionLabel: team.divisionLabel,
          conference: team.conference,
          conferenceSeo: team.conferenceSeo,
          location: team.location,
          domain: team.domain,
          schoolPageUrl: team.schoolPageUrl,
          logoUrl: team.logoUrl,
          rosterUrl: '',
          statsUrl: '',
          playerCount: 0,
          playersWithStats: 0,
          sourceType: team.sourceType,
          unresolved: true,
        },
        players: [],
      }
    }
  })

  for (const result of results) {
    builtTeams.push(result.team)
    builtPlayers.push(...result.players)
  }

  const conferences = [...new Set(builtTeams.map((team) => team.conference).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      teamCount: builtTeams.filter((team) => team.conference === name).length,
    }))

  const dataset = {
    generatedAt: new Date().toISOString(),
    season,
    scope: "NCAA Women's Soccer",
    teams: builtTeams.sort((left, right) => left.name.localeCompare(right.name)),
    players: builtPlayers.sort((left, right) => left.name.localeCompare(right.name)),
    conferences,
    coverage: {
      activeScoreboardTeams: discoveredTeams.length,
      mergeTeamsFileCount: mergeTeams.length,
      mergeTeamsAddedToPool: Math.max(0, activeTeams.length - discoveredTeams.length),
      activeTeamsTotal: activeTeams.length,
      ncaaTeamsResolved: hydratedTeams.length,
      teamsBuilt: builtTeams.length,
      teamsWithRosterData: builtTeams.filter((team) => team.playerCount > 0).length,
      unresolvedTeams: builtTeams.filter((team) => team.unresolved).length,
      conferenceCount: conferences.length,
      playerCount: builtPlayers.length,
      playersWithStats: builtPlayers.filter((player) => player.hasSeasonStats).length,
      goalkeeperCount: builtPlayers.filter((player) => player.positionGroup === 'GK').length,
      failedTeams,
    },
  }

  const browserOutput = `window.SOCCER_DATASET = ${JSON.stringify(dataset)}\n`

  await mkdir(new URL('../data/', import.meta.url), { recursive: true })
  await writeFile(new URL('../data/soccer-dataset.js', import.meta.url), browserOutput)
  process.stdout.write(
    `Wrote ${dataset.players.length} players across ${dataset.teams.length} teams.\n`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
