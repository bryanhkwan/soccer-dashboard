import { mkdir, writeFile } from 'node:fs/promises'
import { load } from 'cheerio'

const season = '2025'
const conference = 'MAC'

const teams = [
  { id: 'akron', name: 'Akron', domain: 'https://gozips.com' },
  { id: 'ball-state', name: 'Ball State', domain: 'https://ballstatesports.com' },
  { id: 'bowling-green', name: 'Bowling Green', domain: 'https://bgsufalcons.com' },
  { id: 'buffalo', name: 'Buffalo', domain: 'https://ubbulls.com' },
  { id: 'central-michigan', name: 'Central Michigan', domain: 'https://cmuchippewas.com' },
  { id: 'eastern-michigan', name: 'Eastern Michigan', domain: 'https://emueagles.com' },
  { id: 'kent-state', name: 'Kent State', domain: 'https://kentstatesports.com' },
  { id: 'miami', name: 'Miami', domain: 'https://miamiredhawks.com' },
  { id: 'northern-illinois', name: 'Northern Illinois', domain: 'https://niuhuskies.com' },
  { id: 'ohio', name: 'Ohio', domain: 'https://ohiobobcats.com', sportPaths: ['wsoc'] },
  { id: 'toledo', name: 'Toledo', domain: 'https://utrockets.com' },
  { id: 'umass', name: 'UMass', domain: 'https://umassathletics.com' },
  { id: 'western-michigan', name: 'Western Michigan', domain: 'https://wmubroncos.com' },
]

const requestHeaders = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseNumber(value) {
  const normalized = normalizeText(value)

  if (!normalized || normalized === '-') {
    return 0
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseNullableNumber(value) {
  const normalized = normalizeText(value)

  if (!normalized || normalized === '-') {
    return null
  }

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

  const pieces = normalized.split(':').map((piece) => Number(piece))
  if (pieces.some((piece) => Number.isNaN(piece))) {
    return 0
  }

  if (pieces.length === 2) {
    const [minutes, seconds] = pieces
    return Math.round(minutes + seconds / 60)
  }

  if (pieces.length === 3) {
    const [hours, minutes, seconds] = pieces
    return Math.round(hours * 60 + minutes + seconds / 60)
  }

  return 0
}

function normalizeClassYear(value) {
  const normalized = normalizeText(value).toLowerCase()

  if (/\bfr\b/.test(normalized) || normalized.includes('fresh')) {
    return 'Fr'
  }

  if (/\bso\b/.test(normalized) || normalized.includes('soph')) {
    return 'So'
  }

  if (/\bjr\b/.test(normalized) || normalized.includes('junior')) {
    return 'Jr'
  }

  if (/\bsr\b/.test(normalized) || normalized.includes('senior')) {
    return 'Sr'
  }

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

  if (firstPart.startsWith('goal') || firstPart === 'gk') {
    return 'GK'
  }

  if (firstPart.startsWith('def') || firstPart === 'd') {
    return 'DEF'
  }

  if (firstPart.startsWith('mid') || firstPart === 'm') {
    return 'MID'
  }

  if (firstPart.startsWith('for') || firstPart === 'f') {
    return 'FWD'
  }

  return 'UTIL'
}

function normalizeDisplayName(value) {
  const normalized = normalizeText(value)

  if (!normalized.includes(',')) {
    return normalized
  }

  const [lastName, ...firstParts] = normalized.split(',').map((part) => normalizeText(part))
  const firstName = firstParts.join(' ')

  return normalizeText(`${firstName} ${lastName}`)
}

function buildNameKey(value) {
  return slugify(
    normalizeDisplayName(value)
      .replace(/\./g, '')
      .replace(/'/g, ''),
  )
}

function extractPlayerId(value) {
  const normalized = normalizeText(value)
  const match = normalized.match(/\/(\d+)(?:[/?#]|$)/)
  return match?.[1] ?? ''
}

async function fetchFirstWorkingPage(baseUrl, candidatePaths) {
  for (const path of candidatePaths) {
    const url = new URL(path, baseUrl).toString()

    try {
      const response = await fetch(url, { headers: requestHeaders })
      if (!response.ok) {
        continue
      }

      const html = await response.text()
      if (html.includes('Women') && html.includes('Soccer')) {
        return { url, html }
      }
    } catch {
      continue
    }
  }

  throw new Error(`No working page found for ${baseUrl}`)
}

function buildRosterPlayer(team, sourceId, values) {
  const displayName = normalizeDisplayName(values.name)
  const rosterUrl = values.rosterPath
    ? new URL(values.rosterPath, team.domain).toString()
    : ''
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

    if (!playerId || !name) {
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

    const jerseyIndex = getColumn('no', '')
    const nameIndex = getColumn('name')
    const positionIndex = getColumn('pos', 'position')
    const classIndex = getColumn('class', 'cl')
    const heightIndex = getColumn('ht', 'height')
    const hometownIndex = normalizedHeaders.findIndex((header) =>
      header.startsWith('hometown'),
    )

    table.find('tbody tr').each((__, rowElement) => {
      const cells = $(rowElement).find('td')
      const nameCell = nameIndex >= 0 ? cells.eq(nameIndex) : null
      const name = normalizeText(nameCell?.text() ?? '')

      if (!name) {
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

  if (legacyPlayers.size > 0) {
    return legacyPlayers
  }

  return parseTableRoster(html, team)
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

    if (!playerId) {
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

  if (start === -1) {
    return null
  }

  const jsonStart = start + marker.length
  const end = html.indexOf('</script>', jsonStart)

  if (end === -1) {
    return null
  }

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
    if (typeof node === 'number') {
      return hydrateByIndex(node)
    }

    if (!node || typeof node !== 'object') {
      return node
    }

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

  if (statRecord.sourceId) {
    statsMap.set(`id:${statRecord.sourceId}`, statRecord)
  }

  if (statRecord.nameKey) {
    statsMap.set(`name:${statRecord.nameKey}`, statRecord)
  }
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

    if (!rawName || rawName.toLowerCase() === 'total') {
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

    if (!rawName || rawName.toLowerCase() === 'total') {
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

function parseStats(html) {
  const $ = load(html)
  const offensiveStats = parseLegacyStatsTable($, 'Individual Overall Offensive Statistics')
  const goalkeepingStats = parseLegacyStatsTable($, 'Individual Overall Goalkeeping Statistics')

  if (offensiveStats.size > 0 || goalkeepingStats.size > 0) {
    return {
      offensiveStats,
      goalkeepingStats,
    }
  }

  return parseNuxtStats(html)
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

async function buildTeamDataset(team) {
  const sportPaths = [...new Set(['womens-soccer', ...(team.sportPaths ?? []), 'wsoc'])]
  const rosterPage = await fetchFirstWorkingPage(team.domain, [
    ...sportPaths.map((sportPath) => `/sports/${sportPath}/roster/${season}`),
    ...sportPaths.map((sportPath) => `/sports/${sportPath}/roster`),
  ])
  const statsPage = await fetchFirstWorkingPage(team.domain, [
    ...sportPaths.map((sportPath) => `/sports/${sportPath}/stats/${season}`),
    ...sportPaths.map((sportPath) => `/sports/${sportPath}/stats`),
  ])

  const rosterPlayers = parseRoster(rosterPage.html, team)
  const { offensiveStats, goalkeepingStats } = parseStats(statsPage.html)
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

  const getStatRecord = (statsMap, player) =>
    statsMap.get(`id:${player.sourceId}`) ?? statsMap.get(`name:${player.nameKey}`) ?? null
  const findRosterKey = (record) =>
    rosterById.get(record.sourceId) ?? rosterByName.get(record.nameKey) ?? null

  for (const statLine of offensiveRecords) {
    if (!findRosterKey(statLine)) {
      const [playerKey, player] = buildRosterPlayer(team, statLine.sourceId, {
        name: statLine.name,
        position: 'N/A',
        classYear: 'N/A',
        hometown: 'N/A',
        highSchool: 'N/A',
        height: 'N/A',
        jersey: 'N/A',
      })

      rosterPlayers.set(playerKey, player)
      if (player.sourceId) {
        rosterById.set(player.sourceId, playerKey)
      }

      rosterByName.set(player.nameKey, playerKey)
    }
  }

  for (const statLine of goalkeepingRecords) {
    if (!findRosterKey(statLine)) {
      const [playerKey, player] = buildRosterPlayer(team, statLine.sourceId, {
        name: statLine.name,
        rosterPath: statLine.rosterPath ?? '',
        position: 'GK',
        classYear: 'N/A',
        hometown: 'N/A',
        highSchool: 'N/A',
        height: 'N/A',
        jersey: 'N/A',
      })

      rosterPlayers.set(playerKey, player)
      if (player.sourceId) {
        rosterById.set(player.sourceId, playerKey)
      }

      rosterByName.set(player.nameKey, playerKey)
    }
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
        position:
          player.position === 'N/A' && goalkeeperStats ? 'GK' : player.position,
        positionGroup:
          player.positionGroup === 'UTIL' && goalkeeperStats ? 'GK' : player.positionGroup,
        hasSeasonStats,
        offensiveStats: fieldStats,
        goalkeepingStats: goalkeeperStats,
      }
    })
    .map(({ sourceId, nameKey, ...player }) => player)
    .sort((left, right) => left.name.localeCompare(right.name))

  return {
    team: {
      id: team.id,
      name: team.name,
      conference,
      domain: team.domain,
      rosterUrl: rosterPage.url,
      statsUrl: statsPage.url,
      playerCount: players.length,
    },
    players,
  }
}

async function main() {
  const builtTeams = []
  const builtPlayers = []

  for (const team of teams) {
    process.stdout.write(`Fetching ${team.name}...\n`)

    const result = await buildTeamDataset(team)
    builtTeams.push(result.team)
    builtPlayers.push(...result.players)
  }

  const dataset = {
    generatedAt: new Date().toISOString(),
    season,
    conference,
    teams: builtTeams,
    players: builtPlayers,
    coverage: {
      teamsRequested: teams.length,
      teamsSucceeded: builtTeams.length,
      rosterCount: builtTeams.reduce((sum, team) => sum + team.playerCount, 0),
      playerCount: builtPlayers.length,
      playersWithStats: builtPlayers.filter((player) => player.hasSeasonStats).length,
      goalkeeperCount: builtPlayers.filter((player) => player.positionGroup === 'GK').length,
    },
  }

  const output = `import type { MacDataset } from './macTypes'\n\nexport const macDataset: MacDataset = ${JSON.stringify(
    dataset,
    null,
    2,
  )}\n`
  const browserOutput = `window.MAC_DATASET = ${JSON.stringify(dataset, null, 2)}\n`

  await mkdir(new URL('../data/', import.meta.url), { recursive: true })
  await writeFile(new URL('../src/data/macDataset.ts', import.meta.url), output)
  await writeFile(new URL('../data/mac-dataset.js', import.meta.url), browserOutput)
  process.stdout.write(
    `Wrote ${dataset.players.length} players across ${dataset.teams.length} teams.\n`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
