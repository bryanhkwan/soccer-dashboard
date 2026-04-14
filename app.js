(function () {
  const dataset = window.SOCCER_DATASET || window.MAC_DATASET
  const transferPortalDataset = window.TRANSFER_PORTAL_DATASET || null

  if (!dataset) {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.innerHTML =
        '<main class="wrap"><section class="card emptyState"><h2>Dataset missing</h2><p>Run <code>npm run generate:soccer</code> to rebuild <code>data/soccer-dataset.js</code>, then refresh this page.</p></section></main>'
    })
    return
  }

  const TOLEDO_TEAM_ID = 'toledo'
  const tableRowLimit = 250
  const wholeNumber = new Intl.NumberFormat('en-US')
  const oneDecimal = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const twoDecimals = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const roleLabels = {
    FWD: 'Forward',
    MID: 'Midfielder',
    DEF: 'Defender',
    GK: 'Goalkeeper',
    UTIL: 'Utility',
  }

  const roleDescriptions = {
    FWD: 'Forward — primary attacking player focused on scoring goals and creating chances near the opponent\'s goal.',
    MID: 'Midfielder — links defense to attack, controls possession, creates chances, and covers ground in both directions.',
    DEF: 'Defender — protects the goal by blocking attacks, winning tackles, and organizing the back line.',
    GK: 'Goalkeeper — last line of defense; the only player who can use their hands inside the penalty area.',
    UTIL: 'Utility — versatile player whose listed position is unclear or spans multiple roles.',
  }

  function getRoleTooltip(roleKey) {
    return roleDescriptions[roleKey] || roleDescriptions.UTIL
  }

  const classLabels = {
    Fr: 'Freshman',
    So: 'Sophomore',
    Jr: 'Junior',
    Sr: 'Senior',
    Grad: 'Graduate',
    Other: 'Other / unclear',
  }

  const roleWeightConfig = {
    FWD: [
      { key: 'goalsPer90', label: 'Goals / 90', weight: 0.3, format: 'rate' },
      { key: 'pointsPer90', label: 'Points / 90', weight: 0.18, format: 'rate' },
      { key: 'shotsPer90', label: 'Shots / 90', weight: 0.16, format: 'rate' },
      { key: 'assistsPer90', label: 'Assists / 90', weight: 0.1, format: 'rate' },
      { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.14, format: 'percent' },
      { key: 'teamShotShare', label: 'Share of team shots', weight: 0.06, format: 'percent' },
      { key: 'minuteShare', label: 'Share of available minutes', weight: 0.06, format: 'percent' },
    ],
    MID: [
      { key: 'assistsPer90', label: 'Assists / 90', weight: 0.18, format: 'rate' },
      { key: 'pointsPer90', label: 'Points / 90', weight: 0.16, format: 'rate' },
      { key: 'goalsPer90', label: 'Goals / 90', weight: 0.1, format: 'rate' },
      { key: 'shotsPer90', label: 'Shots / 90', weight: 0.08, format: 'rate' },
      { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.12, format: 'percent' },
      { key: 'teamShotShare', label: 'Share of team shots', weight: 0.12, format: 'percent' },
      { key: 'minuteShare', label: 'Share of available minutes', weight: 0.18, format: 'percent' },
      { key: 'startsRate', label: 'Start rate', weight: 0.06, format: 'percent' },
    ],
    DEF: [
      { key: 'minuteShare', label: 'Share of available minutes', weight: 0.34, format: 'percent' },
      { key: 'startsRate', label: 'Start rate', weight: 0.22, format: 'percent' },
      { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.08, format: 'percent' },
      { key: 'teamShotShare', label: 'Share of team shots', weight: 0.08, format: 'percent' },
      { key: 'assistsPer90', label: 'Assists / 90', weight: 0.08, format: 'rate' },
      { key: 'pointsPer90', label: 'Points / 90', weight: 0.08, format: 'rate' },
      { key: 'shotsPer90', label: 'Shots / 90', weight: 0.06, format: 'rate' },
      { key: 'goalsPer90', label: 'Goals / 90', weight: 0.06, format: 'rate' },
    ],
    GK: [
      { key: 'savePct', label: 'Save %', weight: 0.34, format: 'percent' },
      { key: 'cleanSheetRate', label: 'Clean-sheet rate', weight: 0.26, format: 'percent' },
      { key: 'savesPer90', label: 'Saves / 90', weight: 0.18, format: 'rate' },
      { key: 'minuteShare', label: 'Share of available minutes', weight: 0.14, format: 'percent' },
      { key: 'startsRate', label: 'Start rate', weight: 0.08, format: 'percent' },
    ],
  }

  const roleOrder = ['FWD', 'MID', 'DEF', 'GK']
  const positionOptions = ['All', 'FWD', 'MID', 'DEF', 'GK', 'UTIL']
  const classOptions = ['All', 'Fr', 'So', 'Jr', 'Sr', 'Grad', 'Other']
  const statsOptions = ['With stats', 'All', 'Roster only']
  const fitClassOptions = [
    { value: 'Any', label: 'Any class' },
    { value: 'Upperclass', label: 'Upperclass (Jr+)' },
    { value: 'Fr', label: 'Freshman' },
    { value: 'So', label: 'Sophomore' },
    { value: 'Jr', label: 'Junior' },
    { value: 'Sr', label: 'Senior' },
    { value: 'Grad', label: 'Graduate' },
  ]
  const fitPositionOptions = [{ value: 'Any', label: 'Any role' }].concat(
    roleOrder.map((role) => ({
      value: role,
      label: roleLabels[role],
    })),
  )
  const archetypeOrder = [
    'scorer',
    'creator',
    'engine',
    'defender',
    'shotStopper',
    'cleanSheetKeeper',
  ]
  const archetypeDefinitions = {
    scorer: {
      label: 'Scorer',
      description: 'Goals, point production, shot volume, and share of a team attack.',
      minimumScore: 55,
      eligible(player) {
        return player.roleKey !== 'GK'
      },
      metrics: [
        { key: 'goalsPer90', label: 'Goals / 90', weight: 0.36, format: 'rate' },
        { key: 'pointsPer90', label: 'Points / 90', weight: 0.18, format: 'rate' },
        { key: 'shotsPer90', label: 'Shots / 90', weight: 0.18, format: 'rate' },
        { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.18, format: 'percent' },
        { key: 'minuteShare', label: 'Share of available minutes', weight: 0.1, format: 'percent' },
      ],
    },
    creator: {
      label: 'Passer / creator',
      description: 'Assist-driven proxy for passing impact using public attacking context.',
      minimumScore: 55,
      eligible(player) {
        return player.roleKey !== 'GK'
      },
      metrics: [
        { key: 'assistsPer90', label: 'Assists / 90', weight: 0.42, format: 'rate' },
        { key: 'pointsPer90', label: 'Points / 90', weight: 0.16, format: 'rate' },
        { key: 'teamShotShare', label: 'Share of team shots', weight: 0.18, format: 'percent' },
        { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.12, format: 'percent' },
        { key: 'minuteShare', label: 'Share of available minutes', weight: 0.12, format: 'percent' },
      ],
    },
    engine: {
      label: 'Midfield engine',
      description: 'High-minute midfield connector with creation and team-usage signals.',
      minimumScore: 55,
      eligible(player) {
        return player.roleKey === 'MID' || player.roleKey === 'UTIL'
      },
      metrics: [
        { key: 'minuteShare', label: 'Share of available minutes', weight: 0.28, format: 'percent' },
        { key: 'startsRate', label: 'Start rate', weight: 0.16, format: 'percent' },
        { key: 'assistsPer90', label: 'Assists / 90', weight: 0.22, format: 'rate' },
        { key: 'pointsPer90', label: 'Points / 90', weight: 0.12, format: 'rate' },
        { key: 'teamShotShare', label: 'Share of team shots', weight: 0.12, format: 'percent' },
        { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.1, format: 'percent' },
      ],
    },
    defender: {
      label: 'Defensive anchor',
      description: 'Usage-based defender proxy built from minutes, starts, and role context.',
      minimumScore: 55,
      eligible(player) {
        return player.roleKey === 'DEF'
      },
      metrics: [
        { key: 'minuteShare', label: 'Share of available minutes', weight: 0.42, format: 'percent' },
        { key: 'startsRate', label: 'Start rate', weight: 0.26, format: 'percent' },
        { key: 'teamShotShare', label: 'Share of team shots', weight: 0.08, format: 'percent' },
        { key: 'teamGoalShare', label: 'Share of team goals', weight: 0.08, format: 'percent' },
        { key: 'assistsPer90', label: 'Assists / 90', weight: 0.08, format: 'rate' },
        { key: 'pointsPer90', label: 'Points / 90', weight: 0.08, format: 'rate' },
      ],
    },
    shotStopper: {
      label: 'Shot-stopper GK',
      description: 'Keeper lens emphasizing save rate and shot volume handled.',
      minimumScore: 55,
      eligible(player) {
        return player.roleKey === 'GK'
      },
      metrics: [
        { key: 'savePct', label: 'Save %', weight: 0.4, format: 'percent' },
        { key: 'savesPer90', label: 'Saves / 90', weight: 0.3, format: 'rate' },
        { key: 'cleanSheetRate', label: 'Clean-sheet rate', weight: 0.1, format: 'percent' },
        { key: 'minuteShare', label: 'Share of available minutes', weight: 0.14, format: 'percent' },
        { key: 'startsRate', label: 'Start rate', weight: 0.06, format: 'percent' },
      ],
    },
    cleanSheetKeeper: {
      label: 'Clean-sheet GK',
      description: 'Keeper lens favoring clean-sheet rate, role security, and shot stopping.',
      minimumScore: 55,
      eligible(player) {
        return player.roleKey === 'GK'
      },
      metrics: [
        { key: 'cleanSheetRate', label: 'Clean-sheet rate', weight: 0.42, format: 'percent' },
        { key: 'savePct', label: 'Save %', weight: 0.26, format: 'percent' },
        { key: 'minuteShare', label: 'Share of available minutes', weight: 0.18, format: 'percent' },
        { key: 'startsRate', label: 'Start rate', weight: 0.08, format: 'percent' },
        { key: 'savesPer90', label: 'Saves / 90', weight: 0.06, format: 'rate' },
      ],
    },
  }
  const archetypeOptions = [{ value: 'All', label: 'All archetypes' }].concat(
    archetypeOrder.map((archetypeId) => ({
      value: archetypeId,
      label: archetypeDefinitions[archetypeId].label,
    })),
  )
  const fitArchetypeOptions = [{ value: 'Any', label: 'Any archetype' }].concat(
    archetypeOrder.map((archetypeId) => ({
      value: archetypeId,
      label: archetypeDefinitions[archetypeId].label,
    })),
  )
  const sortOptions = [
    { value: 'scouting', label: 'Scouting score' },
    { value: 'fit', label: 'Toledo fit score' },
    { value: 'goalsPer90', label: 'Goals / 90' },
    { value: 'assistsPer90', label: 'Assists / 90' },
    { value: 'pointsPer90', label: 'Points / 90' },
    { value: 'shotsPer90', label: 'Shots / 90' },
    { value: 'minuteShare', label: 'Minute share' },
    { value: 'teamGoalShare', label: 'Team goal share' },
    { value: 'minutes', label: 'Minutes' },
    { value: 'points', label: 'Points' },
    { value: 'goals', label: 'Goals' },
    { value: 'assists', label: 'Assists' },
    { value: 'savePct', label: 'Save %' },
    { value: 'savesPer90', label: 'Saves / 90' },
  ]

  const teams = dataset.teams
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
  const teamMap = new Map(teams.map((team) => [team.id, team]))
  const divisionOptions = ['All'].concat(
    [...new Set(teams.map((team) => team.divisionLabel || team.division).filter(Boolean))].sort(),
  )

  const state = {
    search: '',
    division: 'All',
    conference: 'All',
    teamId: 'All',
    position: 'All',
    classYear: 'All',
    archetype: 'All',
    statsFilter: 'With stats',
    sort: 'scouting',
    minMinutes: 250,
    selectedPlayerId: null,
    profilePlayerId: null,
    profileOpen: false,
    compareIds: [],
    fitPositionNeed: 'Any',
    fitClassNeed: 'Any',
    fitDivisionPref: 'Any',
    fitConferencePref: 'Any',
    fitArchetypeNeed: 'Any',
    fitMinMinutes: 540,
    activePage: 'pageBoard',
    transferPortalSearch: '',
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function safeUrl(value) {
    return /^https?:\/\//i.test(String(value ?? '')) ? value : ''
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  function safeDivide(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : 0
  }

  function formatRate(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A'
    }

    return twoDecimals.format(value)
  }

  function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A'
    }

    return `${oneDecimal.format(value * 100)}%`
  }

  function formatScore(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--'
    }

    return wholeNumber.format(Math.round(value))
  }

  function formatTenths(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0.0'
    }

    return oneDecimal.format(value)
  }

  function displayValue(value, fallback) {
    const text = String(value ?? '').trim()
    return text.length ? text : fallback
  }

  function truncateTransferText(text, max) {
    const t = String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    if (t.length <= max) return t
    return `${t.slice(0, max - 1)}…`
  }

  function formatTransferDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function getFilteredTransferPlayers() {
    if (!transferPortalDataset?.players?.length) return []
    const q = state.transferPortalSearch.trim().toLowerCase()
    if (!q) return transferPortalDataset.players

    return transferPortalDataset.players.filter((entry) => {
      const a = entry.athlete || {}
      const s = entry.priorSchool || {}
      const hay = [
        a.displayName,
        a.firstName,
        a.lastName,
        a.city,
        a.state,
        a.positions,
        s.displayName,
        s.division,
        s.city,
        s.state,
        entry.announcementText,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }

  function renderTransferPortal() {
    const meta = document.getElementById('transferPortalMeta')
    const intro = document.getElementById('transferPortalIntro')
    const tbody = document.getElementById('transferPortalTableBody')

    if (!transferPortalDataset || !transferPortalDataset.players) {
      meta.textContent = 'No transfer portal data loaded'
      intro.style.display = 'none'
      tbody.innerHTML =
        '<tr><td colspan="9"><div class="emptyState compactEmpty"><p>Run <code>npm run generate:transfer-portal</code> to build <code>data/transfer-portal-dataset.js</code>, then refresh.</p></div></td></tr>'
      return
    }

    intro.style.display = ''
    const generated = new Date(transferPortalDataset.generatedAt)
    const generatedLabel = Number.isNaN(generated.getTime())
      ? 'unknown time'
      : generated.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

    const filtered = getFilteredTransferPlayers()
    const linkedTotal = ensureTransferPortalDashboardMap().size
    meta.textContent = `${wholeNumber.format(filtered.length)} shown · ${wholeNumber.format(
      transferPortalDataset.players.length,
    )} in snapshot · ${wholeNumber.format(linkedTotal)} linked to roster · synced ${generatedLabel} · source: ${transferPortalDataset.sourceName}`

    if (!transferPortalDataset.players.length) {
      tbody.innerHTML =
        '<tr><td colspan="9"><div class="emptyState compactEmpty"><p>No transfer listings in this snapshot.</p></div></td></tr>'
      return
    }

    if (!filtered.length) {
      tbody.innerHTML =
        '<tr><td colspan="9"><div class="emptyState compactEmpty"><p>No players match this search.</p></div></td></tr>'
      return
    }

    tbody.innerHTML = filtered
      .map((entry) => {
        const a = entry.athlete || {}
        const s = entry.priorSchool
        const fromLoc = [a.city, a.state].filter(Boolean).join(', ') || '—'
        const prior = s?.displayName || '—'
        const div = s?.division || '—'
        const elig =
          entry.yearsOfEligibility === null || entry.yearsOfEligibility === undefined
            ? '—'
            : String(entry.yearsOfEligibility)
        const url = safeUrl(entry.fieldLevelUrl)
        const linkCell = url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">FieldLevel</a>`
          : '—'

        const dashboardPlayerId = getTransferPortalDashboardPlayerId(entry.id)
        const nameCell = dashboardPlayerId
          ? `<button type="button" class="transferPortalNameBtn" data-action="open-dashboard-player" data-player-id="${escapeHtml(dashboardPlayerId)}">${escapeHtml(
              a.displayName || '—',
            )}</button>`
          : `<strong>${escapeHtml(a.displayName || '—')}</strong>`

        return `
          <tr>
            <td>${nameCell}</td>
            <td>${escapeHtml(a.positions || '—')}</td>
            <td>${escapeHtml(prior)}</td>
            <td>${escapeHtml(div)}</td>
            <td>${escapeHtml(fromLoc)}</td>
            <td>${escapeHtml(elig)}</td>
            <td>${escapeHtml(formatTransferDate(entry.announcementDateUtc))}</td>
            <td class="transferAnnouncementCell" title="${escapeHtml(entry.announcementText)}">${escapeHtml(
              truncateTransferText(entry.announcementText, 140),
            )}</td>
            <td>${linkCell}</td>
          </tr>
        `
      })
      .join('')
  }

  function exportTransferPortalCsv() {
    const filtered = getFilteredTransferPlayers()
    if (!filtered.length) {
      return
    }

    const headers = [
      'Player',
      'Positions',
      'Prior program',
      'Division',
      'Hometown',
      'Eligibility years',
      'Announced date (UTC)',
      'Announcement',
      'FieldLevel URL',
      'Dashboard roster id',
    ]

    const lines = [headers.join(',')]
    for (const entry of filtered) {
      const a = entry.athlete || {}
      const s = entry.priorSchool
      const rosterId = getTransferPortalDashboardPlayerId(entry.id) || ''
      const row = [
        a.displayName,
        a.positions,
        s?.displayName,
        s?.division,
        [a.city, a.state].filter(Boolean).join(', '),
        entry.yearsOfEligibility,
        entry.announcementDateUtc,
        entry.announcementText,
        entry.fieldLevelUrl,
        rosterId,
      ].map((cell) => {
        const text = String(cell ?? '')
        if (/[",\n]/.test(text)) {
          return `"${text.replace(/"/g, '""')}"`
        }
        return text
      })
      lines.push(row.join(','))
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = URL.createObjectURL(blob)
    link.download = `transfer-portal-wsoc-${stamp}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function getRawPlayerMinutes(player) {
    return player.goalkeepingStats ? player.goalkeepingStats.minutes : player.offensiveStats.minutes
  }

  function getRawPlayerGames(player) {
    return player.goalkeepingStats ? player.goalkeepingStats.games : player.offensiveStats.games
  }

  function getRawPlayerStarts(player) {
    return player.goalkeepingStats ? player.goalkeepingStats.starts : player.offensiveStats.starts
  }

  function getPer90(stat, minutes) {
    return minutes > 0 ? (stat / minutes) * 90 : null
  }

  function normalizeClassShort(player) {
    const merged = `${player.classYearShort || ''} ${player.classYear || ''}`.toLowerCase()

    if (/\bgrad\b|graduate|fifth/.test(merged)) return 'Grad'
    if (/\bsr\b|senior/.test(merged)) return 'Sr'
    if (/\bjr\b|junior/.test(merged)) return 'Jr'
    if (/\bso\b|sophomore|soph\b|second/.test(merged)) return 'So'
    if (/\bfr\b|freshman|fresh\b|first/.test(merged)) return 'Fr'

    return classOptions.includes(player.classYearShort) ? player.classYearShort : 'Other'
  }

  function normalizeRole(player) {
    if (roleOrder.includes(player.positionGroup)) {
      return player.positionGroup
    }

    const text = `${player.position || ''} ${player.height || ''}`.toUpperCase()
    const hasGoalkeeper = /\bGK\b|\bGOALKEEPER\b|\bGOALKEEP\b|\bG\b/.test(text)
    const hasForward = /\bFORWARD\b|\bFWD\b|\bFW\b|\bSTRIKER\b|\bATTACK\b|(^|[^A-Z])F($|[^A-Z])/.test(text)
    const hasMid = /\bMIDFIELDER\b|\bMIDFIELD\b|\bMID\b|\bMF\b|\bCM\b|\bAM\b|\bDM\b|(^|[^A-Z])M($|[^A-Z])/.test(text)
    const hasDef = /\bDEFENDER\b|\bDEFENSE\b|\bDEF\b|\bDF\b|\bBACK\b|\bCENTER BACK\b|\bCB\b|(^|[^A-Z])D($|[^A-Z])/.test(text)

    if (hasGoalkeeper) return 'GK'
    if (hasForward) return 'FWD'
    if (hasMid) return 'MID'
    if (hasDef) return 'DEF'

    return player.positionGroup || 'UTIL'
  }

  function getScoringRole(player) {
    return roleWeightConfig[player.roleKey] ? player.roleKey : 'MID'
  }

  function buildTeamAnalytics(sourcePlayers) {
    const analytics = new Map()

    sourcePlayers.forEach((player) => {
      const existing = analytics.get(player.teamId) || {
        goals: 0,
        assists: 0,
        shots: 0,
        availableMinutes: 0,
        playerCount: 0,
        statCount: 0,
      }

      existing.playerCount += 1

      if (player.hasSeasonStats) {
        existing.statCount += 1
        existing.goals += player.offensiveStats.goals || 0
        existing.assists += player.offensiveStats.assists || 0
        existing.shots += player.offensiveStats.shots || 0
        existing.availableMinutes = Math.max(existing.availableMinutes, getRawPlayerMinutes(player))
      }

      analytics.set(player.teamId, existing)
    })

    return analytics
  }

  const teamAnalytics = buildTeamAnalytics(dataset.players)

  function preprocessPlayer(player) {
    const team = teamAnalytics.get(player.teamId) || {
      goals: 0,
      assists: 0,
      shots: 0,
      availableMinutes: 0,
    }
    const minutes = getRawPlayerMinutes(player)
    const games = getRawPlayerGames(player)
    const starts = getRawPlayerStarts(player)
    const goals = player.offensiveStats.goals || 0
    const assists = player.offensiveStats.assists || 0
    const points = player.offensiveStats.points || 0
    const shots = player.offensiveStats.shots || 0
    const saves = player.goalkeepingStats?.saves || 0
    const shutouts = player.goalkeepingStats?.shutouts || 0
    const savePct = player.goalkeepingStats ? player.goalkeepingStats.savePct ?? 0 : null
    const normalizedClassShort = normalizeClassShort(player)
    const roleKey = normalizeRole(player)

    return {
      ...player,
      minutes,
      games,
      starts,
      goals,
      assists,
      points,
      shots,
      saves,
      shutouts,
      savePct,
      roleKey,
      roleLabel: roleLabels[roleKey] || roleLabels.UTIL,
      normalizedClassShort,
      normalizedClassLabel: classLabels[normalizedClassShort] || classLabels.Other,
      startsRate: safeDivide(starts, Math.max(games, 1)),
      goalsPer90: getPer90(goals, minutes),
      assistsPer90: getPer90(assists, minutes),
      pointsPer90: getPer90(points, minutes),
      shotsPer90: getPer90(shots, minutes),
      savesPer90: player.goalkeepingStats ? getPer90(saves, minutes) : null,
      cleanSheetRate: player.goalkeepingStats ? safeDivide(shutouts, Math.max(games, 1)) : null,
      teamGoalShare: safeDivide(goals, Math.max(team.goals, 1)),
      teamShotShare: safeDivide(shots, Math.max(team.shots, 1)),
      minuteShare: safeDivide(minutes, Math.max(team.availableMinutes, 1)),
      scoutingScore: null,
    }
  }

  const provisionalPlayers = dataset.players.map(preprocessPlayer)

  function buildMetricDistributions(sourcePlayers) {
    const distributions = {}

    Object.keys(roleWeightConfig).forEach((role) => {
      distributions[role] = {}
      roleWeightConfig[role].forEach((metric) => {
        distributions[role][metric.key] = []
      })
    })

    sourcePlayers.forEach((player) => {
      if (!player.hasSeasonStats || player.minutes <= 0) {
        return
      }

      const scoringRole = getScoringRole(player)
      roleWeightConfig[scoringRole].forEach((metric) => {
        const value = player[metric.key]
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          distributions[scoringRole][metric.key].push(value)
        }
      })
    })

    Object.keys(distributions).forEach((role) => {
      Object.keys(distributions[role]).forEach((metricKey) => {
        distributions[role][metricKey].sort((left, right) => left - right)
      })
    })

    return distributions
  }

  const metricDistributions = buildMetricDistributions(provisionalPlayers)

  function getArchetypeMetricValue(player, metric) {
    return player[metric.key]
  }

  function buildArchetypeDistributions(sourcePlayers) {
    const distributions = {}

    archetypeOrder.forEach((archetypeId) => {
      distributions[archetypeId] = {}
      archetypeDefinitions[archetypeId].metrics.forEach((metric) => {
        distributions[archetypeId][metric.key] = []
      })
    })

    sourcePlayers.forEach((player) => {
      if (!player.hasSeasonStats || player.minutes <= 0) {
        return
      }

      archetypeOrder.forEach((archetypeId) => {
        const definition = archetypeDefinitions[archetypeId]
        if (!definition.eligible(player)) {
          return
        }

        definition.metrics.forEach((metric) => {
          const value = getArchetypeMetricValue(player, metric)
          if (value !== null && value !== undefined && !Number.isNaN(value)) {
            distributions[archetypeId][metric.key].push(value)
          }
        })
      })
    })

    archetypeOrder.forEach((archetypeId) => {
      Object.keys(distributions[archetypeId]).forEach((metricKey) => {
        distributions[archetypeId][metricKey].sort((left, right) => left - right)
      })
    })

    return distributions
  }

  const archetypeDistributions = buildArchetypeDistributions(provisionalPlayers)

  function lowerBound(values, target) {
    let low = 0
    let high = values.length

    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (values[middle] < target) {
        low = middle + 1
      } else {
        high = middle
      }
    }

    return low
  }

  function upperBound(values, target) {
    let low = 0
    let high = values.length

    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (values[middle] <= target) {
        low = middle + 1
      } else {
        high = middle
      }
    }

    return low
  }

  function getPercentileRank(value, sortedValues) {
    if (!sortedValues.length || value === null || value === undefined || Number.isNaN(value)) {
      return 0
    }

    if (sortedValues.length === 1) {
      return 1
    }

    const lower = lowerBound(sortedValues, value)
    const upper = upperBound(sortedValues, value)
    const averageIndex = (lower + upper - 1) / 2

    return clamp(averageIndex / (sortedValues.length - 1), 0, 1)
  }

  function getSampleFactor(minutes) {
    if (!minutes || minutes <= 0) {
      return 0
    }

    return clamp(Math.sqrt(minutes / 900), 0, 1)
  }

  function computeScoutingScore(player) {
    if (!player.hasSeasonStats || player.minutes <= 0) {
      return null
    }

    const scoringRole = getScoringRole(player)
    const weights = roleWeightConfig[scoringRole]
    const weightedScore = weights.reduce((total, metric) => {
      const percentile = getPercentileRank(
        player[metric.key],
        metricDistributions[scoringRole][metric.key],
      )
      return total + percentile * metric.weight * 100
    }, 0)

    return weightedScore * getSampleFactor(player.minutes)
  }

  function computeArchetypeScore(player, archetypeId) {
    const definition = archetypeDefinitions[archetypeId]

    if (!definition || !player.hasSeasonStats || player.minutes <= 0 || !definition.eligible(player)) {
      return null
    }

    const weightedScore = definition.metrics.reduce((total, metric) => {
      const percentile = getPercentileRank(
        getArchetypeMetricValue(player, metric),
        archetypeDistributions[archetypeId][metric.key],
      )
      return total + percentile * metric.weight * 100
    }, 0)

    return weightedScore * getSampleFactor(player.minutes)
  }

  const players = provisionalPlayers
    .map((player) => ({
      ...player,
      scoutingScore: computeScoutingScore(player),
      archetypeScores: Object.fromEntries(
        archetypeOrder.map((archetypeId) => [archetypeId, computeArchetypeScore(player, archetypeId)]),
      ),
    }))
    .map((player) => ({
      ...player,
      topArchetypes: archetypeOrder
        .map((archetypeId) => ({
          id: archetypeId,
          label: archetypeDefinitions[archetypeId].label,
          score: player.archetypeScores[archetypeId],
        }))
        .filter((match) => match.score !== null && match.score !== undefined && !Number.isNaN(match.score))
        .sort((left, right) => right.score - left.score),
    }))
    .sort((left, right) => (right.scoutingScore || -1) - (left.scoutingScore || -1))

  const playerMap = new Map(players.map((player) => [player.id, player]))

  function normalizeTextForMatch(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim()
  }

  function slugifyForMatch(value) {
    return normalizeTextForMatch(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function normalizeDisplayNameForMatch(value) {
    const normalized = normalizeTextForMatch(value)
    if (!normalized.includes(',')) {
      return normalized
    }

    const [lastName, ...firstParts] = normalized.split(',').map((piece) => normalizeTextForMatch(piece))
    return normalizeTextForMatch(`${firstParts.join(' ')} ${lastName}`)
  }

  function buildRosterNameKey(value) {
    const normalized = normalizeDisplayNameForMatch(value)
      .replace(/\./g, '')
      .replace(/[''\u2019]/g, '')
    const folded = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return slugifyForMatch(folded)
  }

  function normalizeSchoolForMatch(value) {
    return normalizeTextForMatch(value)
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

  function findDashboardPlayerForTransfer(entry) {
    const nameKey = buildRosterNameKey(entry.athlete?.displayName ?? '')
    if (!nameKey) {
      return null
    }

    const priorNorm = normalizeSchoolForMatch(entry.priorSchool?.displayName ?? '')
    const sameName = players.filter((player) => buildRosterNameKey(player.name) === nameKey)

    if (sameName.length === 0) {
      return null
    }

    if (sameName.length === 1) {
      return sameName[0]
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
      return best
    }

    return null
  }

  let transferPortalDashboardMap = null

  function ensureTransferPortalDashboardMap() {
    if (transferPortalDashboardMap) {
      return transferPortalDashboardMap
    }

    transferPortalDashboardMap = new Map()
    if (!transferPortalDataset?.players?.length) {
      return transferPortalDashboardMap
    }

    for (const entry of transferPortalDataset.players) {
      const match = findDashboardPlayerForTransfer(entry)
      if (match) {
        transferPortalDashboardMap.set(entry.id, match.id)
      }
    }

    return transferPortalDashboardMap
  }

  function getTransferPortalDashboardPlayerId(entryId) {
    return ensureTransferPortalDashboardMap().get(entryId) || null
  }

  function getArchetypeScore(player, archetypeId) {
    return player?.archetypeScores?.[archetypeId] ?? null
  }

  function getTopArchetypeMatches(player, limit) {
    if (!player?.topArchetypes?.length) {
      return []
    }

    return player.topArchetypes.slice(0, limit)
  }

  function getArchetypeSummary(player, limit) {
    const matches = getTopArchetypeMatches(player, limit)

    if (!matches.length) {
      return 'No public archetype read yet'
    }

    return matches.map((match) => `${match.label} ${formatScore(match.score)}`).join(' | ')
  }

  function matchesArchetype(player, archetypeId) {
    if (!archetypeId || archetypeId === 'All' || archetypeId === 'Any') {
      return true
    }

    const definition = archetypeDefinitions[archetypeId]
    const score = getArchetypeScore(player, archetypeId)
    return Boolean(definition && score !== null && score >= definition.minimumScore)
  }

  function getArchetypeLabel(archetypeId, fallback) {
    return archetypeDefinitions[archetypeId]?.label || fallback
  }

  const metricMaximums = {
    goalsPer90: Math.max(1, ...players.map((player) => player.goalsPer90 || 0)),
    assistsPer90: Math.max(1, ...players.map((player) => player.assistsPer90 || 0)),
    pointsPer90: Math.max(1, ...players.map((player) => player.pointsPer90 || 0)),
    shotsPer90: Math.max(1, ...players.map((player) => player.shotsPer90 || 0)),
    savesPer90: Math.max(1, ...players.map((player) => player.savesPer90 || 0)),
    savePct: Math.max(0.001, ...players.map((player) => player.savePct || 0)),
    cleanSheetRate: Math.max(0.001, ...players.map((player) => player.cleanSheetRate || 0)),
    minuteShare: Math.max(0.001, ...players.map((player) => player.minuteShare || 0)),
    teamGoalShare: Math.max(0.001, ...players.map((player) => player.teamGoalShare || 0)),
    teamShotShare: Math.max(0.001, ...players.map((player) => player.teamShotShare || 0)),
    startsRate: Math.max(0.001, ...players.map((player) => player.startsRate || 0)),
  }

  function buildToledoTurnoverData() {
    const outgoing = players.filter(
      (player) =>
        player.teamId === TOLEDO_TEAM_ID &&
        ['Sr', 'Grad'].includes(player.normalizedClassShort) &&
        player.hasSeasonStats,
    )

    const byRole = new Map()

    outgoing.forEach((player) => {
      const role = getScoringRole(player)
      const existing = byRole.get(role) || {
        role,
        roleLabel: roleLabels[role],
        playerCount: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
      }

      existing.playerCount += 1
      existing.minutes += player.minutes
      existing.goals += player.goals
      existing.assists += player.assists
      byRole.set(role, existing)
    })

    const roleRows = roleOrder
      .map((role) => byRole.get(role) || {
        role,
        roleLabel: roleLabels[role],
        playerCount: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
      })
      .filter((row) => row.playerCount > 0)

    const maxMinutes = Math.max(1, ...roleRows.map((row) => row.minutes), 1)
    const maxGoals = Math.max(1, ...roleRows.map((row) => row.goals), 1)
    const rolePressure = {}

    roleRows.forEach((row) => {
      const minutePressure = row.minutes / maxMinutes
      const goalPressure = row.goals / maxGoals
      rolePressure[row.role] = clamp(minutePressure * 0.7 + goalPressure * 0.3, 0, 1)
    })

    return {
      outgoingPlayers: outgoing
        .slice()
        .sort((left, right) => right.minutes - left.minutes || right.goals - left.goals),
      roleRows,
      rolePressure,
      totals: {
        playerCount: outgoing.length,
        minutes: outgoing.reduce((sum, player) => sum + player.minutes, 0),
        goals: outgoing.reduce((sum, player) => sum + player.goals, 0),
        assists: outgoing.reduce((sum, player) => sum + player.assists, 0),
      },
    }
  }

  const toledoTurnover = buildToledoTurnoverData()

  function getRolePressureRow(role) {
    return (
      toledoTurnover.roleRows.find((row) => row.role === role) || {
        role,
        roleLabel: roleLabels[role] || roleLabels.UTIL,
        playerCount: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
      }
    )
  }

  function formatSignedTenths(value) {
    const amount = Number(value || 0)
    return `${amount >= 0 ? '+' : ''}${formatTenths(amount)}`
  }

  function getFitPreferenceLabel(value, fallback) {
    return value && value !== 'Any' ? value : fallback
  }

  function getFitPreferenceSummary() {
    return [
      `Division preference: ${getFitPreferenceLabel(state.fitDivisionPref, 'None')}`,
      `Conference preference: ${getFitPreferenceLabel(state.fitConferencePref, 'None')}`,
    ].join(' | ')
  }

  function getFitFormulaText(player) {
    if (player.teamId === TOLEDO_TEAM_ID) {
      return 'Current Toledo roster player; external fit bonuses are not applied.'
    }

    const fitBreakdown = getFitBreakdown(player)

    return [
      `${formatTenths(fitBreakdown.base)} scout base`,
      `${formatSignedTenths(fitBreakdown.needBonus)} Toledo need`,
      `${formatSignedTenths(fitBreakdown.divisionBonus)} division match`,
      `${formatSignedTenths(fitBreakdown.conferenceBonus)} conference match`,
      `= ${formatTenths(fitBreakdown.total)} final fit`,
    ].join(' | ')
  }

  function getFitCoachSummary(player) {
    if (player.teamId === TOLEDO_TEAM_ID) {
      return 'Current Toledo roster player. This report does not add outside fit bonuses to current roster players.'
    }

    const fitBreakdown = getFitBreakdown(player)
    const role = getScoringRole(player)
    const rolePressure = getRolePressureRow(role)
    const summary = []

    summary.push(`Scout base: ${formatTenths(fitBreakdown.base)}.`)

    if (fitBreakdown.needBonus > 0) {
      summary.push(
        `Toledo need at ${rolePressure.roleLabel}: ${wholeNumber.format(rolePressure.playerCount)} outgoing senior/grad player${rolePressure.playerCount === 1 ? '' : 's'}, ${wholeNumber.format(rolePressure.minutes)} lost minutes, and ${wholeNumber.format(rolePressure.goals)} lost goals (${formatSignedTenths(fitBreakdown.needBonus)}).`,
      )
    } else {
      summary.push(`No added Toledo need bonus at ${rolePressure.roleLabel} right now (${formatSignedTenths(fitBreakdown.needBonus)}).`)
    }

    if (state.fitDivisionPref !== 'Any' && fitBreakdown.divisionBonus > 0) {
      summary.push(`Matches the preferred division, ${player.divisionLabel} (${formatSignedTenths(fitBreakdown.divisionBonus)}).`)
    } else if (state.fitDivisionPref !== 'Any') {
      summary.push(
        `Does not match the preferred division, ${getFitPreferenceLabel(state.fitDivisionPref, 'No preference')} (${formatSignedTenths(fitBreakdown.divisionBonus)}).`,
      )
    }

    if (state.fitConferencePref !== 'Any' && fitBreakdown.conferenceBonus > 0) {
      summary.push(`Matches the preferred conference, ${player.conference} (${formatSignedTenths(fitBreakdown.conferenceBonus)}).`)
    } else if (state.fitConferencePref !== 'Any') {
      summary.push(
        `Does not match the preferred conference, ${getFitPreferenceLabel(state.fitConferencePref, 'No preference')} (${formatSignedTenths(fitBreakdown.conferenceBonus)}).`,
      )
    }

    if (state.fitDivisionPref === 'Any' && state.fitConferencePref === 'Any') {
      summary.push('No division or conference preference bonus was active.')
    }

    summary.push(`Final Toledo fit: ${formatTenths(fitBreakdown.total)}.`)

    return summary.join(' ')
  }

  function getFitBreakdown(player) {
    if (!player.hasSeasonStats || player.minutes <= 0) {
      return {
        base: player.scoutingScore,
        needBonus: 0,
        divisionBonus: 0,
        conferenceBonus: 0,
        total: player.scoutingScore,
      }
    }

    const needRole = getScoringRole(player)
    const needBonus = player.teamId === TOLEDO_TEAM_ID ? 0 : (toledoTurnover.rolePressure[needRole] || 0) * 8
    const divisionBonus =
      state.fitDivisionPref !== 'Any' && player.divisionLabel === state.fitDivisionPref ? 5 : 0
    const conferenceBonus =
      state.fitConferencePref !== 'Any' && player.conference === state.fitConferencePref ? 3 : 0
    const base = player.scoutingScore || 0

    return {
      base,
      needBonus,
      divisionBonus,
      conferenceBonus,
      total: Math.min(100, base + needBonus + divisionBonus + conferenceBonus),
    }
  }

  function getToledoFitScore(player) {
    if (player.teamId === TOLEDO_TEAM_ID) {
      return null
    }

    return getFitBreakdown(player).total
  }

  function getScoringBreakdown(player) {
    if (!player || !player.hasSeasonStats || player.minutes <= 0) {
      return []
    }

    const scoringRole = getScoringRole(player)
    const sampleFactor = getSampleFactor(player.minutes)

    return roleWeightConfig[scoringRole].map((metric) => {
      const percentile = getPercentileRank(
        player[metric.key],
        metricDistributions[scoringRole][metric.key],
      )

      return {
        ...metric,
        value: player[metric.key],
        percentile,
        contribution: percentile * metric.weight * 100 * sampleFactor,
      }
    })
  }

  function formatMetricValue(value, format) {
    if (format === 'percent') {
      return formatPercent(value)
    }

    return formatRate(value)
  }

  function getTopDrivers(player, count) {
    return getScoringBreakdown(player)
      .slice()
      .sort((left, right) => right.contribution - left.contribution)
      .slice(0, count)
  }

  function getArchetypeBadgeMarkup(player, limit, accentFirst) {
    return getTopArchetypeMatches(player, limit)
      .map((match, index) => {
        const badgeClass = accentFirst && index === 0 ? 'detailBadge detailBadge--accent' : 'detailBadge'
        return `<span class="${badgeClass}">${escapeHtml(match.label)} ${escapeHtml(formatScore(match.score))}</span>`
      })
      .join('')
  }

  function getAvailableConferenceOptions() {
    const filteredTeams = teams.filter(
      (team) => state.division === 'All' || (team.divisionLabel || team.division) === state.division,
    )

    return ['All'].concat(
      [...new Set(filteredTeams.map((team) => team.conference).filter(Boolean))].sort(),
    )
  }

  function getAvailableTeamOptions() {
    const filteredTeams = teams.filter((team) => {
      const matchesDivision =
        state.division === 'All' || (team.divisionLabel || team.division) === state.division
      const matchesConference =
        state.conference === 'All' || team.conference === state.conference
      return matchesDivision && matchesConference
    })

    return [{ value: 'All', label: 'All teams' }].concat(
      filteredTeams.map((team) => ({
        value: team.id,
        label: team.name,
      })),
    )
  }

  function getAvailableFitConferenceOptions() {
    const scopedTeams = teams.filter(
      (team) =>
        state.fitDivisionPref === 'Any' || (team.divisionLabel || team.division) === state.fitDivisionPref,
    )

    return [{ value: 'Any', label: 'No conference preference' }].concat(
      [...new Set(scopedTeams.map((team) => team.conference).filter(Boolean))]
        .sort()
        .map((conference) => ({
          value: conference,
          label: conference,
        })),
    )
  }

  function normalizeDependentFilters() {
    const conferenceOptions = getAvailableConferenceOptions()
    if (!conferenceOptions.includes(state.conference)) {
      state.conference = 'All'
    }

    const teamOptions = getAvailableTeamOptions().map((option) => option.value)
    if (!teamOptions.includes(state.teamId)) {
      state.teamId = 'All'
    }
  }

  function normalizeFitPreferences() {
    const conferenceOptions = getAvailableFitConferenceOptions().map((option) => option.value)
    if (!conferenceOptions.includes(state.fitConferencePref)) {
      state.fitConferencePref = 'Any'
    }
  }

  function createOptionMarkup(options, value) {
    return options
      .map((option) => {
        const optionValue = option.value || option
        const optionLabel = option.label || option
        return `<option value="${escapeHtml(optionValue)}"${
          optionValue === value ? ' selected' : ''
        }>${escapeHtml(optionLabel)}</option>`
      })
      .join('')
  }

  function renderGlobalSelects() {
    normalizeDependentFilters()

    document.getElementById('divisionFilter').innerHTML = createOptionMarkup(
      divisionOptions,
      state.division,
    )
    document.getElementById('conferenceFilter').innerHTML = createOptionMarkup(
      getAvailableConferenceOptions(),
      state.conference,
    )
    document.getElementById('teamFilter').innerHTML = createOptionMarkup(
      getAvailableTeamOptions(),
      state.teamId,
    )
    document.getElementById('classFilter').innerHTML = createOptionMarkup(classOptions, state.classYear)
    document.getElementById('archetypeFilter').innerHTML = createOptionMarkup(
      archetypeOptions,
      state.archetype,
    )
    document.getElementById('statsFilter').innerHTML = createOptionMarkup(statsOptions, state.statsFilter)
    document.getElementById('sortFilter').innerHTML = createOptionMarkup(sortOptions, state.sort)
  }

  function renderFitControls() {
    normalizeFitPreferences()

    document.getElementById('fitPositionNeed').innerHTML = createOptionMarkup(
      fitPositionOptions,
      state.fitPositionNeed,
    )
    document.getElementById('fitClassNeed').innerHTML = createOptionMarkup(
      fitClassOptions,
      state.fitClassNeed,
    )
    document.getElementById('fitDivisionPref').innerHTML = createOptionMarkup(
      [{ value: 'Any', label: 'Any division' }].concat(
        divisionOptions
          .filter((option) => option !== 'All')
          .map((division) => ({ value: division, label: division })),
      ),
      state.fitDivisionPref,
    )
    document.getElementById('fitConferencePref').innerHTML = createOptionMarkup(
      getAvailableFitConferenceOptions(),
      state.fitConferencePref,
    )
    document.getElementById('fitArchetypeNeed').innerHTML = createOptionMarkup(
      fitArchetypeOptions,
      state.fitArchetypeNeed,
    )
  }

  function getSortValue(player, sortKey) {
    switch (sortKey) {
      case 'scouting':
        return player.scoutingScore ?? -1
      case 'fit':
        return getToledoFitScore(player) ?? -1
      case 'goalsPer90':
        return player.goalsPer90 ?? -1
      case 'assistsPer90':
        return player.assistsPer90 ?? -1
      case 'pointsPer90':
        return player.pointsPer90 ?? -1
      case 'shotsPer90':
        return player.shotsPer90 ?? -1
      case 'minuteShare':
        return player.minuteShare ?? -1
      case 'teamGoalShare':
        return player.teamGoalShare ?? -1
      case 'savePct':
        return player.savePct ?? -1
      case 'savesPer90':
        return player.savesPer90 ?? -1
      case 'minutes':
        return player.minutes
      case 'points':
        return player.points
      case 'goals':
        return player.goals
      case 'assists':
        return player.assists
      default:
        return player.scoutingScore ?? -1
    }
  }

  function getFilteredPlayers() {
    const normalizedSearch = state.search.trim().toLowerCase()

    return players
      .filter((player) => {
        const haystack = [
          player.name,
          player.teamName,
          player.conference,
          player.divisionLabel,
          player.position,
          player.roleKey,
          player.classYear,
          player.normalizedClassLabel,
          player.hometown,
          player.highSchool,
        ]
          .join(' ')
          .toLowerCase()

        const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch)
        const matchesDivision =
          state.division === 'All' || player.divisionLabel === state.division
        const matchesConference =
          state.conference === 'All' || player.conference === state.conference
        const matchesTeam = state.teamId === 'All' || player.teamId === state.teamId
        const matchesPosition = state.position === 'All' || player.roleKey === state.position
        const matchesClass =
          state.classYear === 'All' || player.normalizedClassShort === state.classYear
        const matchesArchetypeSelection = matchesArchetype(player, state.archetype)
        const matchesStats =
          state.statsFilter === 'All' ||
          (state.statsFilter === 'With stats' && player.hasSeasonStats) ||
          (state.statsFilter === 'Roster only' && !player.hasSeasonStats)
        const matchesMinutes = !player.hasSeasonStats || player.minutes >= state.minMinutes

        return (
          matchesSearch &&
          matchesDivision &&
          matchesConference &&
          matchesTeam &&
          matchesPosition &&
          matchesClass &&
          matchesArchetypeSelection &&
          matchesStats &&
          matchesMinutes
        )
      })
      .sort((left, right) => {
        if (state.archetype !== 'All') {
          const archetypeDelta =
            (getArchetypeScore(right, state.archetype) ?? -1) -
            (getArchetypeScore(left, state.archetype) ?? -1)

          if (archetypeDelta !== 0) {
            return archetypeDelta
          }
        }

        const rightValue = getSortValue(right, state.sort)
        const leftValue = getSortValue(left, state.sort)

        if (rightValue !== leftValue) {
          return rightValue - leftValue
        }

        return left.name.localeCompare(right.name)
      })
  }

  function matchesFitClassNeed(player) {
    if (state.fitClassNeed === 'Any') return true
    if (state.fitClassNeed === 'Upperclass') {
      return ['Jr', 'Sr', 'Grad'].includes(player.normalizedClassShort)
    }

    return player.normalizedClassShort === state.fitClassNeed
  }

  function getFitCandidates() {
    return players
      .filter((player) => {
        if (player.teamId === TOLEDO_TEAM_ID) return false
        if (!player.hasSeasonStats || player.minutes < state.fitMinMinutes) return false
        if (state.fitPositionNeed !== 'Any' && getScoringRole(player) !== state.fitPositionNeed) {
          return false
        }
        if (!matchesArchetype(player, state.fitArchetypeNeed)) {
          return false
        }

        return matchesFitClassNeed(player)
      })
      .sort((left, right) => {
        const fitDelta = (getToledoFitScore(right) || -1) - (getToledoFitScore(left) || -1)
        if (fitDelta !== 0) return fitDelta

        if (state.fitArchetypeNeed !== 'Any') {
          const archetypeDelta =
            (getArchetypeScore(right, state.fitArchetypeNeed) ?? -1) -
            (getArchetypeScore(left, state.fitArchetypeNeed) ?? -1)
          if (archetypeDelta !== 0) return archetypeDelta
        }

        const scoutingDelta = (right.scoutingScore || -1) - (left.scoutingScore || -1)
        if (scoutingDelta !== 0) return scoutingDelta

        return left.name.localeCompare(right.name)
      })
  }

  function ensureSelectedPlayer(filteredPlayers) {
    const hasSelected = filteredPlayers.some((player) => player.id === state.selectedPlayerId)
    if (!hasSelected) {
      state.selectedPlayerId = filteredPlayers[0] ? filteredPlayers[0].id : null
    }
  }

  function getSelectedPlayer(filteredPlayers) {
    return filteredPlayers.find((player) => player.id === state.selectedPlayerId) || null
  }

  function getProfilePlayer(selectedPlayer) {
    return playerMap.get(state.profilePlayerId) || selectedPlayer || null
  }

  function setActivePage(pageId) {
    state.activePage = pageId

    document.querySelectorAll('.pageNavBtn').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-page') === pageId)
    })

    document.querySelectorAll('.pageSection').forEach((section) => {
      const isActive = section.id === pageId
      section.classList.toggle('isActive', isActive)
      section.style.display = isActive ? 'flex' : 'none'
    })
  }

  function initPageNav() {
    document.querySelectorAll('.pageNavBtn').forEach((button) => {
      button.addEventListener('click', () => {
        setActivePage(button.getAttribute('data-page'))
      })
    })

    setActivePage(state.activePage)
  }

  function renderPositionTabs() {
    const tabs = document.getElementById('positionTabs')
    tabs.innerHTML = positionOptions
      .map((position) => {
        const label = position === 'UTIL' ? 'Utility' : position === 'All' ? 'All roles' : roleLabels[position]
        const activeClass = position === state.position ? 'tab active' : 'tab'
        const tooltip = position === 'All' ? 'Show players from every position' : getRoleTooltip(position)
        return `<button type="button" class="${activeClass}" data-position="${position}" title="${escapeHtml(tooltip)}">${escapeHtml(label)}</button>`
      })
      .join('')

    tabs.querySelectorAll('[data-position]').forEach((button) => {
      button.addEventListener('click', () => {
        state.position = button.getAttribute('data-position')
        renderAll()
      })
    })
  }

  function renderOverview(filteredPlayers) {
    const overviewGrid = document.getElementById('overviewGrid')
    const cards = [
      {
        label: 'Conferences',
        value: wholeNumber.format(dataset.coverage.conferenceCount || dataset.conferences.length),
        text: 'Tracked in this static national build',
      },
      {
        label: 'Teams',
        value: wholeNumber.format(dataset.coverage.teamsBuilt || teams.length),
        text: 'Resolved into the player board',
      },
      {
        label: 'Player pool',
        value: wholeNumber.format(dataset.coverage.playerCount || players.length),
        text: 'Roster entries in this data snapshot',
      },
      {
        label: 'Current view',
        value: wholeNumber.format(filteredPlayers.length),
        text: `${wholeNumber.format(filteredPlayers.filter((player) => player.hasSeasonStats).length)} with public stats`,
      },
    ]

    overviewGrid.innerHTML = cards
      .map(
        (card) => `
          <article class="card kpiCard">
            <div class="kpiLabel">${escapeHtml(card.label)}</div>
            <div class="kpiValue">${escapeHtml(card.value)}</div>
            <div class="kpiText">${escapeHtml(card.text)}</div>
          </article>
        `,
      )
      .join('')
  }

  function getBoardPrimaryMetric(player) {
    if (!player.hasSeasonStats) {
      return 'No cumulative stats'
    }

    if (player.roleKey === 'GK') {
      return `${formatRate(player.savesPer90)} SV/90 | ${formatPercent(player.savePct)} SV%`
    }

    return `${formatRate(player.goalsPer90)} G/90 | ${formatRate(player.assistsPer90)} A/90`
  }

  function getBoardContextMetric(player) {
    if (!player.hasSeasonStats) {
      return 'Roster only'
    }

    if (player.roleKey === 'GK') {
      return `${formatPercent(player.cleanSheetRate)} CS rate | ${formatPercent(player.minuteShare)} min share`
    }

    if (player.roleKey === 'DEF') {
      return `${formatPercent(player.minuteShare)} min share | ${formatPercent(player.startsRate)} start rate`
    }

    return `${formatPercent(player.teamGoalShare)} goal share | ${formatPercent(player.teamShotShare)} shot share`
  }

  function getBoardScoreMarkup(player) {
    const scouting = formatScore(player.scoutingScore)
    const fit = player.teamId === TOLEDO_TEAM_ID ? 'Roster' : `Fit ${formatScore(getToledoFitScore(player))}`

    return `
      <div class="scoreCell">
        <strong>${escapeHtml(scouting)}</strong>
        <span>${escapeHtml(fit)}</span>
      </div>
    `
  }

  function renderBoard(filteredPlayers) {
    const body = document.getElementById('playerTableBody')
    const visiblePlayers = filteredPlayers.slice(0, tableRowLimit)

    document.getElementById('resultsCount').textContent = `${wholeNumber.format(filteredPlayers.length)} matches`
    document.getElementById('visibleCount').textContent = `${wholeNumber.format(visiblePlayers.length)} shown`

    if (!filteredPlayers.length) {
      body.innerHTML =
        '<tr><td colspan="11"><div class="emptyState"><h3>No players match these filters</h3><p>Broaden the search, open the archetype lens, or lower the minutes floor to reopen the pool.</p></div></td></tr>'
      return
    }

    body.innerHTML = visiblePlayers
      .map((player) => {
        const activeClass = player.id === state.selectedPlayerId ? 'isActive' : ''
        const statusClass = player.hasSeasonStats ? 'statusPill isGood' : 'statusPill'
        return `
          <tr class="${activeClass}" data-player-id="${escapeHtml(player.id)}">
            <td>
              <div><strong>${escapeHtml(player.name)}</strong></div>
              <div class="muted">${escapeHtml(displayValue(player.hometown, 'Hometown N/A'))} | ${escapeHtml(displayValue(player.highSchool, 'High school N/A'))}</div>
            </td>
            <td>${escapeHtml(player.teamName)}</td>
            <td>${escapeHtml(player.conference)}</td>
            <td>${escapeHtml(player.divisionLabel.replace('Division ', 'D'))}</td>
            <td title="${escapeHtml(getRoleTooltip(player.roleKey))}">${escapeHtml(player.roleKey)}</td>
            <td>${escapeHtml(player.normalizedClassShort)}</td>
            <td>${escapeHtml(wholeNumber.format(player.minutes))}</td>
            <td>${getBoardScoreMarkup(player)}</td>
            <td>${escapeHtml(getBoardPrimaryMetric(player))}</td>
            <td>${escapeHtml(getBoardContextMetric(player))}</td>
            <td><span class="${statusClass}">${player.hasSeasonStats ? 'Stats' : 'Roster only'}</span></td>
          </tr>
        `
      })
      .join('')

    body.querySelectorAll('[data-player-id]').forEach((row) => {
      row.addEventListener('click', () => {
        const playerId = row.getAttribute('data-player-id')
        state.selectedPlayerId = playerId
        state.profilePlayerId = playerId
        state.profileOpen = true
        renderAll()
      })
    })
  }

  function getLeaderCards(filteredPlayers, fitCandidates) {
    const source = filteredPlayers.length ? filteredPlayers : players
    const fieldPlayers = source.filter((player) => player.hasSeasonStats && player.roleKey !== 'GK')
    const goalkeepers = source.filter(
      (player) => player.hasSeasonStats && player.roleKey === 'GK' && player.minutes >= 450,
    )

    return [
      {
        title: 'Top Toledo fit',
        metric: 'FIT',
        player: fitCandidates[0],
        value(player) {
          return formatScore(getToledoFitScore(player))
        },
      },
      {
        title: 'Goals / 90 leader',
        metric: 'G/90',
        player: fieldPlayers
          .filter((player) => player.minutes >= 450)
          .sort((left, right) => (right.goalsPer90 || 0) - (left.goalsPer90 || 0))[0],
        value(player) {
          return formatRate(player.goalsPer90)
        },
      },
      {
        title: 'Assists / 90 leader',
        metric: 'A/90',
        player: fieldPlayers
          .filter((player) => player.minutes >= 450)
          .sort((left, right) => (right.assistsPer90 || 0) - (left.assistsPer90 || 0))[0],
        value(player) {
          return formatRate(player.assistsPer90)
        },
      },
      {
        title: 'Goalkeeper anchor',
        metric: 'SV%',
        player: goalkeepers.sort((left, right) => (right.savePct || 0) - (left.savePct || 0))[0],
        value(player) {
          return formatPercent(player.savePct)
        },
      },
    ].filter((card) => card.player)
  }

  function renderLeaders(filteredPlayers, fitCandidates) {
    const leaderGrid = document.getElementById('leaderGrid')
    const leaderCards = getLeaderCards(filteredPlayers, fitCandidates)

    leaderGrid.innerHTML = leaderCards
      .map(
        (card) => `
          <button type="button" class="leaderCard" data-player-id="${escapeHtml(card.player.id)}">
            <span class="leaderMetric">${escapeHtml(card.metric)}</span>
            <div class="leaderName">${escapeHtml(card.player.name)}</div>
            <div class="leaderMeta">${escapeHtml(card.player.teamName)} | ${escapeHtml(card.player.conference)}</div>
            <div class="leaderValue">${escapeHtml(card.value(card.player))}</div>
            <div class="leaderMeta">${escapeHtml(card.title)}</div>
          </button>
        `,
      )
      .join('')

    leaderGrid.querySelectorAll('[data-player-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const playerId = button.getAttribute('data-player-id')
        if (playerMap.has(playerId)) {
          state.selectedPlayerId = playerId
        }
        state.profilePlayerId = playerId
        state.profileOpen = true
        renderAll()
      })
    })
  }

  function getDetailStats(player) {
    if (player.roleKey === 'GK') {
      return [
        { label: 'Games', value: wholeNumber.format(player.games) },
        { label: 'Starts', value: wholeNumber.format(player.starts) },
        { label: 'Minutes', value: wholeNumber.format(player.minutes) },
        { label: 'Saves / 90', value: formatRate(player.savesPer90) },
        { label: 'Save %', value: formatPercent(player.savePct) },
        { label: 'CS rate', value: formatPercent(player.cleanSheetRate) },
      ]
    }

    return [
      { label: 'Games', value: wholeNumber.format(player.games) },
      { label: 'Starts', value: wholeNumber.format(player.starts) },
      { label: 'Minutes', value: wholeNumber.format(player.minutes) },
      { label: 'Goals / 90', value: formatRate(player.goalsPer90) },
      { label: 'Assists / 90', value: formatRate(player.assistsPer90) },
      { label: 'Shots / 90', value: formatRate(player.shotsPer90) },
    ]
  }

  function getScoreCards(player) {
    const fitBreakdown = getFitBreakdown(player)
    const spotlight =
      player.roleKey === 'GK'
        ? { label: 'Save %', value: formatPercent(player.savePct), note: `${formatPercent(player.cleanSheetRate)} clean-sheet rate` }
        : player.roleKey === 'DEF'
          ? { label: 'Minute share', value: formatPercent(player.minuteShare), note: `${formatPercent(player.startsRate)} start rate` }
          : player.roleKey === 'MID'
            ? { label: 'Assists / 90', value: formatRate(player.assistsPer90), note: `${formatPercent(player.teamShotShare)} shot share` }
            : { label: 'Goals / 90', value: formatRate(player.goalsPer90), note: `${formatPercent(player.teamGoalShare)} goal share` }

    return [
      {
        label: 'Scouting score',
        value: formatScore(player.scoutingScore),
        note: `${formatTenths(getSampleFactor(player.minutes))}x minutes reliability`,
      },
      {
        label: 'Toledo fit',
        value: player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatScore(fitBreakdown.total),
        note:
          player.teamId === TOLEDO_TEAM_ID
            ? 'Current Toledo roster player'
            : `Need +${formatTenths(fitBreakdown.needBonus)} | Pref +${formatTenths(fitBreakdown.divisionBonus + fitBreakdown.conferenceBonus)}`,
      },
      {
        label: 'Available minute share',
        value: formatPercent(player.minuteShare),
        note: `${wholeNumber.format(player.minutes)} public minutes`,
      },
      spotlight,
    ]
  }

  function renderDetail(selectedPlayer) {
    const detailCard = document.getElementById('playerDetailCard')

    if (!selectedPlayer) {
      detailCard.innerHTML =
        '<div class="emptyState"><h3>No player selected</h3><p>Adjust the filters or choose a player from the board.</p></div>'
      return
    }

    const compareLabel = state.compareIds.includes(selectedPlayer.id) ? 'Remove from compare' : 'Add to compare'
    const topDrivers = getTopDrivers(selectedPlayer, 3)

    detailCard.innerHTML = `
      <div class="sectionEyebrow">Selected player</div>
      <div class="detailName">${escapeHtml(selectedPlayer.name)}</div>
      <div class="detailMeta">
        ${escapeHtml(selectedPlayer.teamName)} | ${escapeHtml(selectedPlayer.conference)} | ${escapeHtml(selectedPlayer.divisionLabel)}
      </div>
      <div class="detailBadgeRow">
        <span class="detailBadge detailBadge--accent">${selectedPlayer.hasSeasonStats ? 'Stats' : 'Roster only'}</span>
        <span class="detailBadge" title="${escapeHtml(getRoleTooltip(selectedPlayer.roleKey))}">${escapeHtml(selectedPlayer.roleLabel)}</span>
        <span class="detailBadge">${escapeHtml(selectedPlayer.normalizedClassLabel)}</span>
        <span class="detailBadge">${escapeHtml(displayValue(selectedPlayer.position, selectedPlayer.roleLabel))}</span>
        ${getArchetypeBadgeMarkup(selectedPlayer, 2, false)}
      </div>
      <div class="detailNote">
        ${escapeHtml(displayValue(selectedPlayer.hometown, 'Hometown N/A'))} | ${escapeHtml(displayValue(selectedPlayer.highSchool, 'High school N/A'))}
      </div>
      <div class="detailScoreGrid">
        ${getScoreCards(selectedPlayer)
          .map(
            (card) => `
              <article class="detailScoreCard">
                <div class="detailScoreLabel">${escapeHtml(card.label)}</div>
                <div class="detailScoreValue">${escapeHtml(card.value)}</div>
                <div class="detailScoreNote">${escapeHtml(card.note)}</div>
              </article>
            `,
          )
          .join('')}
      </div>
      <div class="detailStatGrid">
        ${getDetailStats(selectedPlayer)
          .map(
            (stat) => `
              <article class="detailStatCard">
                <div class="detailStatLabel">${escapeHtml(stat.label)}</div>
                <div class="detailStatValue">${escapeHtml(stat.value)}</div>
              </article>
            `,
          )
          .join('')}
      </div>
      <section class="panelBlock">
        <div class="panelTitle">Scouting read</div>
        <ul class="detailList">
          <li>Performance score uses same-role percentile ranks and role-specific weights.</li>
          <li>Top drivers: ${escapeHtml(
            topDrivers.length
              ? topDrivers
                  .map(
                    (driver) =>
                      `${driver.label} ${formatMetricValue(driver.value, driver.format)} (${formatPercent(driver.percentile)} peer percentile)`,
                  )
                  .join(' | ')
              : 'No public production yet',
          )}</li>
          <li>Team context: ${escapeHtml(
            selectedPlayer.roleKey === 'GK'
              ? `${formatPercent(selectedPlayer.cleanSheetRate)} clean-sheet rate | ${formatPercent(selectedPlayer.minuteShare)} minute share`
              : `${formatPercent(selectedPlayer.teamGoalShare)} share of team goals | ${formatPercent(selectedPlayer.teamShotShare)} share of team shots | ${formatPercent(selectedPlayer.minuteShare)} minute share`,
          )}</li>
          <li>Archetype reads: ${escapeHtml(getArchetypeSummary(selectedPlayer, 2))}</li>
          <li>Minutes reliability reaches full strength at 900 minutes using a square-root ramp.</li>
        </ul>
      </section>
      <div class="detailLinkRow">
        <button type="button" class="secondary detailActionBtn" id="toggleCompareBtn">${escapeHtml(compareLabel)}</button>
        <button type="button" class="primary detailActionBtn" id="openProfileBtn">Open full profile</button>
      </div>
    `

    document.getElementById('toggleCompareBtn').addEventListener('click', () => {
      toggleCompare(selectedPlayer.id)
    })
    document.getElementById('openProfileBtn').addEventListener('click', () => {
      openProfile(selectedPlayer.id)
    })
  }

  function renderCoverage(filteredPlayers) {
    const coverageBars = document.getElementById('schoolCoverageBars')
    const counts = new Map()

    filteredPlayers.forEach((player) => {
      const current = counts.get(player.teamId) || { count: 0, statCount: 0 }
      current.count += 1
      if (player.hasSeasonStats) current.statCount += 1
      counts.set(player.teamId, current)
    })

    const rows = [...counts.entries()]
      .map(([teamId, values]) => ({
        team: teamMap.get(teamId)?.name || teamId,
        count: values.count,
        statCount: values.statCount,
      }))
      .sort((left, right) => right.count - left.count || right.statCount - left.statCount)

    const maxCount = Math.max(...rows.map((row) => row.count), 1)

    coverageBars.innerHTML = rows.length
      ? rows
          .slice(0, 14)
          .map(
            (row) => `
              <article class="barItem">
                <div class="barTop">
                  <b>${escapeHtml(row.team)}</b>
                  <span class="barMeta">${escapeHtml(row.count)} players | ${escapeHtml(row.statCount)} with stats</span>
                </div>
                <div class="barTrack">
                  <div class="barFill" style="width:${(row.count / maxCount) * 100}%"></div>
                </div>
              </article>
            `,
          )
          .join('')
      : '<div class="emptyState"><p>No teams match the current filter set.</p></div>'
  }

  function getMetricBars(player) {
    if (player.roleKey === 'GK') {
      return [
        {
          label: 'Saves / 90',
          value: formatRate(player.savesPer90),
          width: (player.savesPer90 || 0) / metricMaximums.savesPer90,
        },
        {
          label: 'Save %',
          value: formatPercent(player.savePct),
          width: (player.savePct || 0) / metricMaximums.savePct,
        },
        {
          label: 'Clean-sheet rate',
          value: formatPercent(player.cleanSheetRate),
          width: (player.cleanSheetRate || 0) / metricMaximums.cleanSheetRate,
        },
        {
          label: 'Minute share',
          value: formatPercent(player.minuteShare),
          width: (player.minuteShare || 0) / metricMaximums.minuteShare,
        },
      ]
    }

    if (player.roleKey === 'DEF') {
      return [
        {
          label: 'Minute share',
          value: formatPercent(player.minuteShare),
          width: (player.minuteShare || 0) / metricMaximums.minuteShare,
        },
        {
          label: 'Start rate',
          value: formatPercent(player.startsRate),
          width: (player.startsRate || 0) / metricMaximums.startsRate,
        },
        {
          label: 'Team goal share',
          value: formatPercent(player.teamGoalShare),
          width: (player.teamGoalShare || 0) / metricMaximums.teamGoalShare,
        },
        {
          label: 'Team shot share',
          value: formatPercent(player.teamShotShare),
          width: (player.teamShotShare || 0) / metricMaximums.teamShotShare,
        },
      ]
    }

    if (player.roleKey === 'MID') {
      return [
        {
          label: 'Assists / 90',
          value: formatRate(player.assistsPer90),
          width: (player.assistsPer90 || 0) / metricMaximums.assistsPer90,
        },
        {
          label: 'Points / 90',
          value: formatRate(player.pointsPer90),
          width: (player.pointsPer90 || 0) / metricMaximums.pointsPer90,
        },
        {
          label: 'Team goal share',
          value: formatPercent(player.teamGoalShare),
          width: (player.teamGoalShare || 0) / metricMaximums.teamGoalShare,
        },
        {
          label: 'Minute share',
          value: formatPercent(player.minuteShare),
          width: (player.minuteShare || 0) / metricMaximums.minuteShare,
        },
      ]
    }

    return [
      {
        label: 'Goals / 90',
        value: formatRate(player.goalsPer90),
        width: (player.goalsPer90 || 0) / metricMaximums.goalsPer90,
      },
      {
        label: 'Shots / 90',
        value: formatRate(player.shotsPer90),
        width: (player.shotsPer90 || 0) / metricMaximums.shotsPer90,
      },
      {
        label: 'Team goal share',
        value: formatPercent(player.teamGoalShare),
        width: (player.teamGoalShare || 0) / metricMaximums.teamGoalShare,
      },
      {
        label: 'Minute share',
        value: formatPercent(player.minuteShare),
        width: (player.minuteShare || 0) / metricMaximums.minuteShare,
      },
    ]
  }

  function renderScoringModelCard(selectedPlayer) {
    const container = document.getElementById('scoringModelCard')
    const focusedRole =
      state.fitPositionNeed !== 'Any'
        ? state.fitPositionNeed
        : selectedPlayer
          ? getScoringRole(selectedPlayer)
          : 'FWD'

    container.innerHTML = `
      <div class="fitPanelTitle">How the score works</div>
      <p class="scoringLead">
        Scouting score is a 0-100 performance grade built from same-role percentile ranks.
        Each role uses different weights, then the result is scaled by a minutes reliability
        factor: <strong>sqrt(minutes / 900)</strong>, capped at 1.0.
      </p>
      <p class="scoringHint">
        Toledo fit score starts with scouting score, then adds a roster-need bonus from Toledo's
        outgoing production and optional preference bonuses for division (+5) and conference (+3).
      </p>
      <p class="scoringHint">
        Archetype filters sit on top of that same public data. Scorer leans on goals and shot load,
        passer / creator leans on assists and team-attack involvement, defensive anchor is a
        usage-based defender proxy, and the goalkeeper lenses split into shot-stopping vs clean-sheet
        security.
      </p>
      <p class="scoringHint">
        Important caveat: this dataset does not have passes completed, key passes, tackles,
        interceptions, duels, or progressive carries, so "great passer" and "great defender" are
        directional scouting filters, not full event-data grades.
      </p>
      <div class="scoringRoleGrid">
        ${roleOrder
          .map((role) => {
            const activeClass = role === focusedRole ? 'scoringRoleCard isActive' : 'scoringRoleCard'
            return `
              <article class="${activeClass}">
                <div class="scoringRoleHead">
                  <div class="scoringRoleTitle">${escapeHtml(roleLabels[role])}</div>
                  <div class="scoringRoleMeta">${escapeHtml(role)}</div>
                </div>
                <div class="scoringWeightList">
                  ${roleWeightConfig[role]
                    .map(
                      (metric) => `
                        <div class="scoringWeightRow">
                          <span>${escapeHtml(metric.label)}</span>
                          <strong>${escapeHtml(wholeNumber.format(metric.weight * 100))}%</strong>
                        </div>
                      `,
                    )
                    .join('')}
                </div>
              </article>
            `
          })
          .join('')}
      </div>
    `
  }

  function renderFitSummary(fitCandidates) {
    const container = document.getElementById('fitSummaryGrid')
    const topTarget = fitCandidates[0]
    const topNeed = toledoTurnover.roleRows
      .slice()
      .sort((left, right) => (toledoTurnover.rolePressure[right.role] || 0) - (toledoTurnover.rolePressure[left.role] || 0))[0]
    const divisionOneCount = fitCandidates.filter((player) => player.divisionLabel === 'Division I').length

    const cards = [
      {
        label: 'Candidate pool',
        value: wholeNumber.format(fitCandidates.length),
        text: `${wholeNumber.format(divisionOneCount)} Division I candidates above the minutes floor`,
      },
      {
        label: 'Top target',
        value: topTarget ? topTarget.name : 'No match',
        text: topTarget
          ? `${topTarget.teamName} | Fit ${formatScore(getToledoFitScore(topTarget))}`
          : 'Broaden the fit board filters',
      },
      {
        label: 'Biggest Toledo need',
        value: topNeed ? topNeed.roleLabel : 'No outgoing data',
        text: topNeed
          ? `${wholeNumber.format(topNeed.minutes)} outgoing minutes | ${wholeNumber.format(topNeed.goals)} goals`
          : 'No senior/grad departures with public stats',
      },
      {
        label: 'Current lens',
        value:
          state.fitPositionNeed === 'Any' && state.fitClassNeed === 'Any'
            ? 'Wide open'
            : `${state.fitPositionNeed === 'Any' ? 'Any role' : roleLabels[state.fitPositionNeed]} / ${
                state.fitClassNeed === 'Any'
                  ? 'Any class'
                  : state.fitClassNeed === 'Upperclass'
                    ? 'Upperclass'
                    : classLabels[state.fitClassNeed]
              }`,
        text: `Division: ${
          state.fitDivisionPref === 'Any' ? 'open' : state.fitDivisionPref
        } | Conference: ${state.fitConferencePref === 'Any' ? 'open' : state.fitConferencePref} | Archetype: ${
          state.fitArchetypeNeed === 'Any' ? 'open' : getArchetypeLabel(state.fitArchetypeNeed, 'open')
        }`,
      },
    ]

    container.innerHTML = cards
      .map(
        (card) => `
          <article class="summaryCard">
            <div class="summaryLabel">${escapeHtml(card.label)}</div>
            <div class="summaryValue">${escapeHtml(card.value)}</div>
            <div class="summaryText">${escapeHtml(card.text)}</div>
          </article>
        `,
      )
      .join('')
  }

  function getFitCardContext(player) {
    if (player.roleKey === 'GK') {
      return `${formatRate(player.savesPer90)} SV/90 | ${formatPercent(player.savePct)} SV% | ${formatPercent(player.cleanSheetRate)} CS`
    }

    return `${formatRate(player.goalsPer90)} G/90 | ${formatRate(player.assistsPer90)} A/90 | ${formatRate(player.shotsPer90)} SH/90`
  }

  function getFitCardSecondary(player) {
    if (player.roleKey === 'GK') {
      return `${formatPercent(player.minuteShare)} minute share | ${formatPercent(player.startsRate)} start rate`
    }

    return `${formatPercent(player.teamGoalShare)} goal share | ${formatPercent(player.teamShotShare)} shot share | ${formatPercent(player.minuteShare)} min share`
  }

  function renderFitBoard(fitCandidates) {
    const container = document.getElementById('fitBoardGrid')
    const visibleCandidates = fitCandidates.slice(0, 12)

    document.getElementById('fitPoolCount').textContent = `${wholeNumber.format(fitCandidates.length)} candidates`
    document.getElementById('fitMinLabel').textContent = `${wholeNumber.format(state.fitMinMinutes)} min floor`
    document.getElementById('fitMinutesValue').textContent = wholeNumber.format(state.fitMinMinutes)

    if (!fitCandidates.length) {
      container.innerHTML =
        '<div class="emptyState"><h3>No Toledo-fit candidates yet</h3><p>Lower the minutes floor or open up the role, class, or archetype filters.</p></div>'
      return
    }

    container.innerHTML = visibleCandidates
      .map((player, index) => {
        const fitBreakdown = getFitBreakdown(player)
        const compareLabel = state.compareIds.includes(player.id) ? 'Remove compare' : 'Add compare'
        return `
          <article class="fitCandidateCard">
            <div class="candidateTopRow">
              <span class="candidateRank">#${escapeHtml(index + 1)}</span>
              <span class="candidateFitBadge">Fit ${escapeHtml(formatScore(fitBreakdown.total))}</span>
            </div>
            <div class="candidateName">${escapeHtml(player.name)}</div>
            <div class="candidateMeta">${escapeHtml(player.teamName)} | ${escapeHtml(player.conference)} | <span title="${escapeHtml(getRoleTooltip(player.roleKey))}">${escapeHtml(player.roleLabel)}</span> | ${escapeHtml(player.normalizedClassLabel)}</div>
            <div class="candidateScoreRow">
              <article class="candidateScoreBlock">
                <div class="candidateScoreLabel">Scouting</div>
                <div class="candidateScoreValue">${escapeHtml(formatScore(player.scoutingScore))}</div>
              </article>
              <article class="candidateScoreBlock">
                <div class="candidateScoreLabel">Need bonus</div>
                <div class="candidateScoreValue">+${escapeHtml(formatTenths(fitBreakdown.needBonus))}</div>
              </article>
              <article class="candidateScoreBlock">
                <div class="candidateScoreLabel">Prefs</div>
                <div class="candidateScoreValue">+${escapeHtml(formatTenths(fitBreakdown.divisionBonus + fitBreakdown.conferenceBonus))}</div>
              </article>
            </div>
            <div class="candidateSubContext">${escapeHtml(
              state.fitArchetypeNeed === 'Any'
                ? `Archetypes: ${getArchetypeSummary(player, 2)}`
                : `${getArchetypeLabel(state.fitArchetypeNeed, 'Archetype')} match ${formatScore(
                    getArchetypeScore(player, state.fitArchetypeNeed),
                  )}`,
            )}</div>
            <div class="candidateContext">${escapeHtml(getFitCardContext(player))}</div>
            <div class="candidateSubContext">${escapeHtml(getFitCardSecondary(player))}</div>
            <div class="candidateActions">
              <button type="button" class="secondary" data-compare-player="${escapeHtml(player.id)}">${escapeHtml(compareLabel)}</button>
              <button type="button" class="primary" data-open-player="${escapeHtml(player.id)}">Open profile</button>
            </div>
          </article>
        `
      })
      .join('')

    container.querySelectorAll('[data-compare-player]').forEach((button) => {
      button.addEventListener('click', () => {
        toggleCompare(button.getAttribute('data-compare-player'))
      })
    })

    container.querySelectorAll('[data-open-player]').forEach((button) => {
      button.addEventListener('click', () => {
        openProfile(button.getAttribute('data-open-player'))
      })
    })
  }

  function renderCompare(comparePlayers) {
    const tray = document.getElementById('compareTray')
    const shell = document.getElementById('compareShell')
    document.getElementById('compareCount').textContent = `${comparePlayers.length} selected`

    tray.innerHTML = comparePlayers.length
      ? comparePlayers
          .map(
            (player) => `
              <article class="comparePlayerCard">
                <div class="comparePlayerHead">
                  <div>
                    <div class="comparePlayerName">${escapeHtml(player.name)}</div>
                    <div class="comparePlayerMeta">${escapeHtml(player.teamName)} | <span title="${escapeHtml(getRoleTooltip(player.roleKey))}">${escapeHtml(player.roleLabel)}</span> | ${escapeHtml(player.normalizedClassLabel)}</div>
                  </div>
                  <button type="button" class="compareRemoveBtn" data-remove-compare="${escapeHtml(player.id)}">Remove</button>
                </div>
                <div class="comparePlayerStats">
                  <span class="chip">Scout ${escapeHtml(formatScore(player.scoutingScore))}</span>
                  <span class="chip">${escapeHtml(player.teamId === TOLEDO_TEAM_ID ? 'Toledo roster' : `Fit ${formatScore(getToledoFitScore(player))}`)}</span>
                </div>
                <div class="candidateActions compareActions">
                  <button type="button" class="secondary" data-open-player="${escapeHtml(player.id)}">Open profile</button>
                </div>
              </article>
            `,
          )
          .join('')
      : '<div class="emptyState compactEmpty"><p>Add 2-4 players from the board, fit cards, or profile modal to compare them side by side.</p></div>'

    tray.querySelectorAll('[data-remove-compare]').forEach((button) => {
      button.addEventListener('click', () => {
        toggleCompare(button.getAttribute('data-remove-compare'))
      })
    })

    tray.querySelectorAll('[data-open-player]').forEach((button) => {
      button.addEventListener('click', () => {
        openProfile(button.getAttribute('data-open-player'))
      })
    })

    if (comparePlayers.length < 2) {
      shell.innerHTML =
        '<div class="emptyState compactEmpty"><h3>Compare mode starts at two players</h3><p>Once at least two players are selected, this section will render a side-by-side breakdown of production, context, and Toledo fit.</p></div>'
      return
    }

    const rows = [
      {
        label: 'Team',
        value(player) {
          return player.teamName
        },
      },
      {
        label: 'Conference / Division',
        value(player) {
          return `${player.conference} | ${player.divisionLabel}`
        },
      },
      {
        label: 'Role / Class',
        value(player) {
          return `${player.roleLabel} | ${player.normalizedClassLabel}`
        },
      },
      {
        label: 'Archetype read',
        value(player) {
          return getArchetypeSummary(player, 2)
        },
      },
      {
        label: 'Scouting score',
        value(player) {
          return formatScore(player.scoutingScore)
        },
      },
      {
        label: 'Toledo fit',
        value(player) {
          return player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatScore(getToledoFitScore(player))
        },
      },
      {
        label: 'Games / Starts / Minutes',
        value(player) {
          return `${wholeNumber.format(player.games)} / ${wholeNumber.format(player.starts)} / ${wholeNumber.format(player.minutes)}`
        },
      },
      {
        label: 'Goals / 90',
        value(player) {
          return player.roleKey === 'GK' ? 'N/A' : formatRate(player.goalsPer90)
        },
        relevant(player) {
          return player.roleKey !== 'GK'
        },
      },
      {
        label: 'Assists / 90',
        value(player) {
          return player.roleKey === 'GK' ? 'N/A' : formatRate(player.assistsPer90)
        },
        relevant(player) {
          return player.roleKey !== 'GK'
        },
      },
      {
        label: 'Points / 90',
        value(player) {
          return player.roleKey === 'GK' ? 'N/A' : formatRate(player.pointsPer90)
        },
        relevant(player) {
          return player.roleKey !== 'GK'
        },
      },
      {
        label: 'Shots / 90',
        value(player) {
          return player.roleKey === 'GK' ? 'N/A' : formatRate(player.shotsPer90)
        },
        relevant(player) {
          return player.roleKey !== 'GK'
        },
      },
      {
        label: 'Save %',
        value(player) {
          return player.roleKey === 'GK' ? formatPercent(player.savePct) : 'N/A'
        },
        relevant(player) {
          return player.roleKey === 'GK'
        },
      },
      {
        label: 'Saves / 90',
        value(player) {
          return player.roleKey === 'GK' ? formatRate(player.savesPer90) : 'N/A'
        },
        relevant(player) {
          return player.roleKey === 'GK'
        },
      },
      {
        label: 'Clean-sheet rate',
        value(player) {
          return player.roleKey === 'GK' ? formatPercent(player.cleanSheetRate) : 'N/A'
        },
        relevant(player) {
          return player.roleKey === 'GK'
        },
      },
      {
        label: 'Team goal share',
        value(player) {
          return player.roleKey === 'GK' ? 'N/A' : formatPercent(player.teamGoalShare)
        },
        relevant(player) {
          return player.roleKey !== 'GK'
        },
      },
      {
        label: 'Team shot share',
        value(player) {
          return player.roleKey === 'GK' ? 'N/A' : formatPercent(player.teamShotShare)
        },
        relevant(player) {
          return player.roleKey !== 'GK'
        },
      },
      {
        label: 'Available minute share',
        value(player) {
          return formatPercent(player.minuteShare)
        },
      },
      {
        label: 'Top score drivers',
        value(player) {
          const topDrivers = getTopDrivers(player, 2)
          return topDrivers.length
            ? topDrivers.map((driver) => `${driver.label} ${formatMetricValue(driver.value, driver.format)}`).join(' | ')
            : 'No public production'
        },
      },
    ].filter((row) => !row.relevant || comparePlayers.some((player) => row.relevant(player)))

    shell.innerHTML = `
      <div class="compareTableShell scrollY">
        <table class="compareTable">
          <thead>
            <tr>
              <th>Metric</th>
              ${comparePlayers
                .map((player) => `<th>${escapeHtml(player.name)}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.label)}</td>
                    ${comparePlayers
                      .map((player) => `<td>${escapeHtml(row.value(player))}</td>`)
                      .join('')}
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
  }

  function renderTurnover() {
    const summary = document.getElementById('turnoverSummary')
    const positions = document.getElementById('turnoverPositions')
    const list = document.getElementById('turnoverPlayerList')
    const biggestNeed = toledoTurnover.roleRows
      .slice()
      .sort((left, right) => right.minutes - left.minutes || right.goals - left.goals)[0]

    document.getElementById('turnoverBadge').textContent = `${wholeNumber.format(toledoTurnover.totals.playerCount)} outgoing players`

    const summaryCards = [
      {
        label: 'Outgoing players',
        value: wholeNumber.format(toledoTurnover.totals.playerCount),
      },
      {
        label: 'Lost minutes',
        value: wholeNumber.format(toledoTurnover.totals.minutes),
      },
      {
        label: 'Lost goals',
        value: wholeNumber.format(toledoTurnover.totals.goals),
      },
      {
        label: 'Top need',
        value: biggestNeed ? biggestNeed.roleLabel : 'No gap',
      },
    ]

    summary.innerHTML = summaryCards
      .map(
        (card) => `
          <article class="turnoverCard">
            <div class="turnoverLabel">${escapeHtml(card.label)}</div>
            <div class="turnoverValue">${escapeHtml(card.value)}</div>
          </article>
        `,
      )
      .join('')

    positions.innerHTML = toledoTurnover.roleRows.length
      ? toledoTurnover.roleRows
          .map((row) => {
            const pressure = toledoTurnover.rolePressure[row.role] || 0
            return `
              <article class="barItem">
                <div class="barTop">
                  <b title="${escapeHtml(roleDescriptions[row.role] || '')}">${escapeHtml(row.roleLabel)}</b>
                  <span class="barMeta">${escapeHtml(row.playerCount)} players | ${escapeHtml(wholeNumber.format(row.minutes))} minutes | ${escapeHtml(wholeNumber.format(row.goals))} goals</span>
                </div>
                <div class="barTrack">
                  <div class="barFill" style="width:${pressure * 100}%"></div>
                </div>
              </article>
            `
          })
          .join('')
      : '<div class="emptyState compactEmpty"><p>No senior or graduate outgoing production was found for Toledo in the current public stat snapshot.</p></div>'

    list.innerHTML = toledoTurnover.outgoingPlayers.length
      ? toledoTurnover.outgoingPlayers
          .map(
            (player) => `
              <tr>
                <td>${escapeHtml(player.name)}</td>
                <td title="${escapeHtml(getRoleTooltip(player.roleKey))}">${escapeHtml(player.roleKey)}</td>
                <td>${escapeHtml(player.normalizedClassShort)}</td>
                <td>${escapeHtml(wholeNumber.format(player.minutes))}</td>
                <td>${escapeHtml(wholeNumber.format(player.goals))}</td>
                <td>${escapeHtml(wholeNumber.format(player.assists))}</td>
                <td>${escapeHtml(formatPercent(player.teamGoalShare))}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="7">No Toledo outgoing players with public stats found in the current snapshot.</td></tr>'
  }

  function renderProfileModal(player) {
    const body = document.getElementById('profileModalBody')
    const modalSub = document.getElementById('profileModalSub')

    if (!player) {
      body.innerHTML =
        '<div class="emptyState"><h3>No player selected</h3><p>Choose a player from the board to open the profile.</p></div>'
      modalSub.textContent = 'National scouting card'
      return
    }

    const metricBars = getMetricBars(player)
    const teamSiteUrl = safeUrl(player.teamSiteUrl)
    const rosterUrl = safeUrl(player.rosterUrl || player.teamRosterUrl)
    const statsUrl = safeUrl(player.teamStatsUrl)
    const logoUrl = safeUrl(player.teamLogoUrl)
    const compareLabel = state.compareIds.includes(player.id) ? 'Remove from compare' : 'Add to compare'
    const fitBreakdown = getFitBreakdown(player)

    modalSub.textContent = `${player.teamName} | ${player.conference} | ${player.divisionLabel}`
    body.innerHTML = `
      <div class="profileHero">
        <div class="profileIdentity">
          ${
            logoUrl
              ? `<img class="profileLogo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(player.teamName)} logo" />`
              : ''
          }
          <div>
            <div class="profileEyebrow">Player profile</div>
            <div class="profileName">${escapeHtml(player.name)}</div>
            <div class="profileMeta">${escapeHtml(player.teamName)} | ${escapeHtml(displayValue(player.position, player.roleLabel))} | ${escapeHtml(player.normalizedClassLabel)} | ${escapeHtml(displayValue(player.hometown, 'Hometown N/A'))}</div>
            <div class="chipRow">
              <span class="chip"><span class="dot"></span>${escapeHtml(player.conference)}</span>
              <span class="chip">${escapeHtml(player.divisionLabel)}</span>
              <span class="chip">${escapeHtml(displayValue(player.height, 'Height N/A'))}</span>
              <span class="chip">${escapeHtml(player.hasSeasonStats ? 'Public stats available' : 'Roster only')}</span>
              ${getTopArchetypeMatches(player, 2)
                .map(
                  (match) =>
                    `<span class="chip">${escapeHtml(match.label)} ${escapeHtml(formatScore(match.score))}</span>`,
                )
                .join('')}
            </div>
          </div>
        </div>
        <div class="profileScore">
          <div class="mini">Scouting score</div>
          <div class="big">${escapeHtml(formatScore(player.scoutingScore))}</div>
          <div class="muted">${escapeHtml(player.teamId === TOLEDO_TEAM_ID ? 'Current Toledo roster' : `Toledo fit ${formatScore(fitBreakdown.total)}`)}</div>
        </div>
      </div>

      <div class="profileScoreGrid">
        ${getScoreCards(player)
          .map(
            (card) => `
              <article class="profileScoreCard">
                <div class="detailScoreLabel">${escapeHtml(card.label)}</div>
                <div class="detailScoreValue">${escapeHtml(card.value)}</div>
                <div class="detailScoreNote">${escapeHtml(card.note)}</div>
              </article>
            `,
          )
          .join('')}
      </div>

      <div class="miniStatGrid">
        ${getDetailStats(player)
          .map(
            (stat) => `
              <article class="miniStatCard">
                <div class="miniStatLabel">${escapeHtml(stat.label)}</div>
                <div class="miniStatValue">${escapeHtml(stat.value)}</div>
              </article>
            `,
          )
          .join('')}
      </div>

      <div class="profileGrid">
        <section class="panel">
          <div class="panelHead">Production profile</div>
          <div class="panelBody bars">
            ${metricBars
              .map(
                (metric) => `
                  <div class="barItem">
                    <div class="barTop"><b>${escapeHtml(metric.label)}</b><span>${escapeHtml(metric.value)}</span></div>
                    <div class="barTrack"><div class="barFill" style="width:${Math.min(metric.width * 100, 100)}%"></div></div>
                  </div>
                `,
              )
              .join('')}
          </div>
        </section>

        <section class="panel">
          <div class="panelHead">Background</div>
          <div class="panelBody">
            <div class="statRow"><span class="k">Role</span><span title="${escapeHtml(getRoleTooltip(player.roleKey))}">${escapeHtml(player.roleLabel)}</span></div>
            <div class="statRow"><span class="k">Class</span><span>${escapeHtml(player.normalizedClassLabel)}</span></div>
            <div class="statRow"><span class="k">Hometown</span><span>${escapeHtml(displayValue(player.hometown, 'N/A'))}</span></div>
            <div class="statRow"><span class="k">High school</span><span>${escapeHtml(displayValue(player.highSchool, 'N/A'))}</span></div>
            <div class="statRow"><span class="k">Team site</span><span>${escapeHtml(teamSiteUrl ? 'Linked below' : 'Unavailable')}</span></div>
            <div class="statRow"><span class="k">Public status</span><span>${escapeHtml(player.hasSeasonStats ? 'Roster + cumulative stats' : 'Roster only')}</span></div>
            <div class="statRow"><span class="k">Archetype read</span><span>${escapeHtml(getArchetypeSummary(player, 2))}</span></div>
          </div>
        </section>
      </div>

      <div class="profileGrid">
        <section class="panel">
          <div class="panelHead">Score breakdown</div>
          <div class="panelBody scoreBreakdownList">
            ${getScoringBreakdown(player)
              .map(
                (item) => `
                  <div class="scoreBreakdownRow">
                    <span>${escapeHtml(item.label)}</span>
                    <span>${escapeHtml(formatMetricValue(item.value, item.format))}</span>
                    <span>${escapeHtml(formatPercent(item.percentile))}</span>
                    <strong>${escapeHtml(formatTenths(item.contribution))}</strong>
                  </div>
                `,
              )
              .join('')}
          </div>
        </section>

        <section class="panel">
          <div class="panelHead">Toledo read</div>
          <div class="panelBody">
            <div class="statRow"><span class="k">Scouting base</span><span>${escapeHtml(formatTenths(player.scoutingScore || 0))}</span></div>
            <div class="statRow"><span class="k">Role need bonus</span><span>+${escapeHtml(formatTenths(fitBreakdown.needBonus))}</span></div>
            <div class="statRow"><span class="k">Division bonus</span><span>+${escapeHtml(formatTenths(fitBreakdown.divisionBonus))}</span></div>
            <div class="statRow"><span class="k">Conference bonus</span><span>+${escapeHtml(formatTenths(fitBreakdown.conferenceBonus))}</span></div>
            <div class="statRow"><span class="k">Minutes factor</span><span>${escapeHtml(formatTenths(getSampleFactor(player.minutes)))}</span></div>
            <div class="statRow"><span class="k">Archetypes</span><span>${escapeHtml(getArchetypeSummary(player, 2))}</span></div>
            <div class="statRow"><span class="k">Top drivers</span><span>${escapeHtml(
              getTopDrivers(player, 2)
                .map((driver) => driver.label)
                .join(' | ') || 'No public production',
            )}</span></div>
          </div>
        </section>
      </div>

      <div class="profileLinks">
        <button type="button" class="primary" id="profileCompareBtn">${escapeHtml(compareLabel)}</button>
        ${teamSiteUrl ? `<a class="learnMoreBtn" href="${escapeHtml(teamSiteUrl)}" target="_blank" rel="noreferrer">Team site</a>` : ''}
        ${rosterUrl ? `<a class="learnMoreBtn" href="${escapeHtml(rosterUrl)}" target="_blank" rel="noreferrer">Roster page</a>` : ''}
        ${statsUrl ? `<a class="learnMoreBtn" href="${escapeHtml(statsUrl)}" target="_blank" rel="noreferrer">Stats page</a>` : ''}
      </div>
    `

    const compareButton = document.getElementById('profileCompareBtn')
    if (compareButton) {
      compareButton.addEventListener('click', () => {
        toggleCompare(player.id)
      })
    }
  }

  function openProfile(playerId) {
    if (!playerId) {
      return
    }

    state.profilePlayerId = playerId
    state.profileOpen = true
    document.body.classList.add('modalOpen')
    document.getElementById('profileModalBack').style.display = 'flex'
    renderProfileModal(playerMap.get(playerId))
  }

  function closeProfile() {
    state.profileOpen = false
    state.profilePlayerId = null
    document.body.classList.remove('modalOpen')
    document.getElementById('profileModalBack').style.display = 'none'
  }

  function openDashboardFromTransferPortal(playerId) {
    if (!playerId || !playerMap.has(playerId)) {
      return
    }

    state.selectedPlayerId = playerId
    openProfile(playerId)
    renderAll()
  }

  function toggleCompare(playerId) {
    const index = state.compareIds.indexOf(playerId)

    if (index >= 0) {
      state.compareIds.splice(index, 1)
      renderAll()
      return
    }

    if (state.compareIds.length >= 4) {
      window.alert('Compare mode holds up to 4 players at once.')
      return
    }

    state.compareIds.push(playerId)
    renderAll()
  }

  function clearCompare() {
    state.compareIds = []
    renderAll()
  }

  function downloadCsv(filename, rows) {
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  function exportFitCsv() {
    const fitCandidates = getFitCandidates()
    const rows = [
      [
        'Rank',
        'Player',
        'Team',
        'Conference',
        'Division',
        'Role',
        'Class',
        'Archetype Read',
        'Minutes',
        'Scouting Score',
        'Toledo Fit Score',
        'Fit Base (Scout)',
        'Fit Need Bonus',
        'Fit Division Bonus',
        'Fit Conference Bonus',
        'Fit Formula',
        'Why Toledo',
        'Goals',
        'Assists',
        'Points',
        'Goals / 90',
        'Assists / 90',
        'Shots / 90',
        'Save %',
        'Clean-sheet rate',
        'Minute share',
        'Team goal share',
        'Team shot share',
      ],
    ]

    fitCandidates.forEach((player, index) => {
      const fitBreakdown = getFitBreakdown(player)

      rows.push([
        index + 1,
        player.name,
        player.teamName,
        player.conference,
        player.divisionLabel,
        player.roleLabel,
        player.normalizedClassLabel,
        getArchetypeSummary(player, 2),
        player.minutes,
        formatScore(player.scoutingScore),
        formatTenths(fitBreakdown.total),
        formatTenths(fitBreakdown.base),
        formatTenths(fitBreakdown.needBonus),
        formatTenths(fitBreakdown.divisionBonus),
        formatTenths(fitBreakdown.conferenceBonus),
        getFitFormulaText(player),
        getFitCoachSummary(player),
        player.goals,
        player.assists,
        player.points,
        formatRate(player.goalsPer90),
        formatRate(player.assistsPer90),
        formatRate(player.shotsPer90),
        formatPercent(player.savePct),
        formatPercent(player.cleanSheetRate),
        formatPercent(player.minuteShare),
        formatPercent(player.teamGoalShare),
        formatPercent(player.teamShotShare),
      ])
    })

    downloadCsv('toledo-fit-shortlist.csv', rows)
  }

  function buildReportTable(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    `
  }

  function openReport() {
    const fitCandidates = getFitCandidates().slice(0, 20)
    const comparePlayers = state.compareIds.map((id) => playerMap.get(id)).filter(Boolean)
    const reportWindow = window.open('', '_blank', 'width=1200,height=900')

    if (!reportWindow) {
      window.alert('The report window was blocked. Please allow pop-ups for this site.')
      return
    }

    const fitRows = fitCandidates.map((player, index) => {
      const fitBreakdown = getFitBreakdown(player)

      return [
        `${index + 1}`,
        player.name,
        player.teamName,
        player.roleLabel,
        player.normalizedClassLabel,
        wholeNumber.format(player.minutes),
        formatTenths(fitBreakdown.base),
        formatTenths(fitBreakdown.needBonus),
        formatTenths(fitBreakdown.divisionBonus),
        formatTenths(fitBreakdown.conferenceBonus),
        formatTenths(fitBreakdown.total),
        getFitCoachSummary(player),
      ]
    })

    const compareRows = comparePlayers.map((player) => {
      const fitBreakdown = getFitBreakdown(player)

      return [
        player.name,
        player.teamName,
        player.roleLabel,
        player.normalizedClassLabel,
        wholeNumber.format(player.minutes),
        player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatTenths(fitBreakdown.base),
        player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatTenths(fitBreakdown.needBonus),
        player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatTenths(fitBreakdown.divisionBonus),
        player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatTenths(fitBreakdown.conferenceBonus),
        player.teamId === TOLEDO_TEAM_ID ? 'Roster' : formatTenths(fitBreakdown.total),
        getFitCoachSummary(player),
      ]
    })

    reportWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Toledo Soccer Scouting Report</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 32px;
              color: #111827;
            }
            h1, h2 {
              margin: 0 0 12px;
            }
            p {
              line-height: 1.6;
            }
            .meta {
              color: #4b5563;
              margin-bottom: 24px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin: 20px 0 28px;
            }
            .card {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 16px;
            }
            .label {
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #6b7280;
            }
            .value {
              font-size: 26px;
              font-weight: 700;
              margin-top: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
              vertical-align: top;
            }
            th {
              background: #f3f4f6;
            }
            .note {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 12px;
              padding: 14px 16px;
              margin-top: 12px;
              line-height: 1.6;
            }
            section {
              margin-top: 28px;
            }
          </style>
        </head>
        <body>
          <h1>Toledo Women's Soccer Scouting Report</h1>
          <p class="meta">Generated ${escapeHtml(
            new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
          )}. Use your browser's print dialog to save this report as PDF.</p>

          <div class="grid">
            <div class="card">
              <div class="label">Outgoing players</div>
              <div class="value">${escapeHtml(wholeNumber.format(toledoTurnover.totals.playerCount))}</div>
            </div>
            <div class="card">
              <div class="label">Lost minutes</div>
              <div class="value">${escapeHtml(wholeNumber.format(toledoTurnover.totals.minutes))}</div>
            </div>
            <div class="card">
              <div class="label">Lost goals</div>
              <div class="value">${escapeHtml(wholeNumber.format(toledoTurnover.totals.goals))}</div>
            </div>
            <div class="card">
              <div class="label">Fit shortlist</div>
              <div class="value">${escapeHtml(wholeNumber.format(getFitCandidates().length))}</div>
            </div>
          </div>

          <section>
            <h2>Score model</h2>
            <p>
              Scouting score is a 0-100 grade built from same-role percentile ranks and role-specific
              weights. The score is then scaled by a minutes reliability factor of sqrt(minutes / 900),
              capped at 1.0. Toledo fit score adds a role-need bonus from Toledo's outgoing production,
              plus optional division and conference preference bonuses. Archetype filters reuse the same
              public stat base to surface scorers, creators, defensive anchors, and goalkeeper profiles.
            </p>
            <p>
              "Passer / creator" and "defensive anchor" are proxy reads, because this public dataset
              does not include pass-completion, key-pass, tackle, interception, or duel data.
            </p>
            <div class="note">
              <strong>How to read Toledo fit:</strong> Start with the scouting base, then add a small Toledo
              role-need bonus, then add any active division or conference match bonus. In this report,
              fit pieces are shown to one decimal so the numbers are easy to explain from left to right.<br />
              <strong>Current coach preferences:</strong> ${escapeHtml(getFitPreferenceSummary())}
            </div>
          </section>

          <section>
            <h2>Top Toledo fit candidates</h2>
            ${buildReportTable(
              ['Rank', 'Player', 'Team', 'Role', 'Class', 'Minutes', 'Scout base', 'Need', 'Division', 'Conference', 'Final fit', 'Why Toledo'],
              fitRows,
            )}
          </section>

          <section>
            <h2>Toledo outgoing production</h2>
            ${buildReportTable(
              ['Player', 'Role', 'Class', 'Minutes', 'Goals', 'Assists', 'Team goal share'],
              toledoTurnover.outgoingPlayers.map((player) => [
                player.name,
                player.roleLabel,
                player.normalizedClassLabel,
                wholeNumber.format(player.minutes),
                wholeNumber.format(player.goals),
                wholeNumber.format(player.assists),
                formatPercent(player.teamGoalShare),
              ]),
            )}
          </section>

          ${
            compareRows.length
              ? `
                <section>
                  <h2>Compare set</h2>
                  ${buildReportTable(
                    ['Player', 'Team', 'Role', 'Class', 'Minutes', 'Scout base', 'Need', 'Division', 'Conference', 'Final fit', 'Why Toledo'],
                    compareRows,
                  )}
                </section>
              `
              : ''
          }
        </body>
      </html>
    `)

    reportWindow.document.close()
    reportWindow.focus()
  }

  function renderHeaderMeta() {
    const generatedLabel = new Date(dataset.generatedAt).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    document.getElementById('headerGenerated').textContent = `Generated ${generatedLabel}`
    document.getElementById('headerSeason').textContent = dataset.season
    document.title = `NCAA Women's Soccer Scouting Board`
  }

  function renderAll() {
    renderGlobalSelects()
    renderFitControls()

    const filteredPlayers = getFilteredPlayers()
    const fitCandidates = getFitCandidates()
    const comparePlayers = state.compareIds.map((id) => playerMap.get(id)).filter(Boolean)

    ensureSelectedPlayer(filteredPlayers)
    const selectedPlayer = getSelectedPlayer(filteredPlayers)
    const profilePlayer = getProfilePlayer(selectedPlayer)

    document.getElementById('minutesValue').textContent = wholeNumber.format(state.minMinutes)
    document.getElementById('boardFootnote').textContent = `Public school roster pages and cumulative stat pages power this view. Showing up to ${wholeNumber.format(tableRowLimit)} rows for speed out of ${wholeNumber.format(filteredPlayers.length)} filtered matches. Archetype lens: ${
      state.archetype === 'All' ? 'open' : getArchetypeLabel(state.archetype, 'open')
    }.`

    renderPositionTabs()
    renderOverview(filteredPlayers)
    renderScoringModelCard(selectedPlayer)
    renderFitSummary(fitCandidates)
    renderFitBoard(fitCandidates)
    renderCompare(comparePlayers)
    renderTurnover()
    renderTransferPortal()
    renderBoard(filteredPlayers)
    renderLeaders(filteredPlayers, fitCandidates)
    renderDetail(selectedPlayer)
    renderCoverage(filteredPlayers)

    if (state.profileOpen) {
      if (profilePlayer) {
        document.body.classList.add('modalOpen')
        document.getElementById('profileModalBack').style.display = 'flex'
        renderProfileModal(profilePlayer)
      } else {
        closeProfile()
      }
    }
  }

  function initControls() {
    renderHeaderMeta()
    renderGlobalSelects()
    renderFitControls()
    initPageNav()

    const firstDefaultPlayer = players.find((player) => player.hasSeasonStats) || players[0] || null
    state.selectedPlayerId = firstDefaultPlayer ? firstDefaultPlayer.id : null

    document.getElementById('searchInput').addEventListener('input', (event) => {
      state.search = event.target.value
      renderAll()
    })

    document.getElementById('divisionFilter').addEventListener('change', (event) => {
      state.division = event.target.value
      state.conference = 'All'
      state.teamId = 'All'
      renderAll()
    })

    document.getElementById('conferenceFilter').addEventListener('change', (event) => {
      state.conference = event.target.value
      state.teamId = 'All'
      renderAll()
    })

    document.getElementById('teamFilter').addEventListener('change', (event) => {
      state.teamId = event.target.value
      renderAll()
    })

    document.getElementById('classFilter').addEventListener('change', (event) => {
      state.classYear = event.target.value
      renderAll()
    })

    document.getElementById('archetypeFilter').addEventListener('change', (event) => {
      state.archetype = event.target.value
      renderAll()
    })

    document.getElementById('statsFilter').addEventListener('change', (event) => {
      state.statsFilter = event.target.value
      renderAll()
    })

    document.getElementById('sortFilter').addEventListener('change', (event) => {
      state.sort = event.target.value
      renderAll()
    })

    document.getElementById('minutesRange').addEventListener('input', (event) => {
      state.minMinutes = Number(event.target.value)
      renderAll()
    })

    document.getElementById('fitPositionNeed').addEventListener('change', (event) => {
      state.fitPositionNeed = event.target.value
      renderAll()
    })

    document.getElementById('fitClassNeed').addEventListener('change', (event) => {
      state.fitClassNeed = event.target.value
      renderAll()
    })

    document.getElementById('fitDivisionPref').addEventListener('change', (event) => {
      state.fitDivisionPref = event.target.value
      state.fitConferencePref = 'Any'
      renderAll()
    })

    document.getElementById('fitConferencePref').addEventListener('change', (event) => {
      state.fitConferencePref = event.target.value
      renderAll()
    })

    document.getElementById('fitArchetypeNeed').addEventListener('change', (event) => {
      state.fitArchetypeNeed = event.target.value
      renderAll()
    })

    document.getElementById('fitMinutesRange').addEventListener('input', (event) => {
      state.fitMinMinutes = Number(event.target.value)
      renderAll()
    })

    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
      state.search = ''
      state.division = 'All'
      state.conference = 'All'
      state.teamId = 'All'
      state.position = 'All'
      state.classYear = 'All'
      state.archetype = 'All'
      state.statsFilter = 'With stats'
      state.sort = 'scouting'
      state.minMinutes = 250

      document.getElementById('searchInput').value = ''
      document.getElementById('minutesRange').value = String(state.minMinutes)
      renderAll()
    })

    document.getElementById('resetFitBtn').addEventListener('click', () => {
      state.fitPositionNeed = 'Any'
      state.fitClassNeed = 'Any'
      state.fitDivisionPref = 'Any'
      state.fitConferencePref = 'Any'
      state.fitArchetypeNeed = 'Any'
      state.fitMinMinutes = 540
      document.getElementById('fitMinutesRange').value = String(state.fitMinMinutes)
      renderAll()
    })

    document.getElementById('clearCompareBtn').addEventListener('click', clearCompare)
    document.getElementById('exportFitCsvBtn').addEventListener('click', exportFitCsv)
    document.getElementById('exportReportBtn').addEventListener('click', openReport)

    const transferPortalSearch = document.getElementById('transferPortalSearch')
    if (transferPortalSearch) {
      transferPortalSearch.value = state.transferPortalSearch
      transferPortalSearch.addEventListener('input', (event) => {
        state.transferPortalSearch = event.target.value
        renderTransferPortal()
      })
    }

    const transferPortalExportBtn = document.getElementById('transferPortalExportBtn')
    if (transferPortalExportBtn) {
      transferPortalExportBtn.addEventListener('click', exportTransferPortalCsv)
    }

    const transferPortalTableBody = document.getElementById('transferPortalTableBody')
    if (transferPortalTableBody) {
      transferPortalTableBody.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="open-dashboard-player"]')
        if (!button) {
          return
        }

        const playerId = button.getAttribute('data-player-id')
        openDashboardFromTransferPortal(playerId)
      })
    }

    const filterGrid = document.getElementById('filterGrid')
    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn')
    if (toggleFiltersBtn && filterGrid) {
      toggleFiltersBtn.addEventListener('click', () => {
        const isHidden = filterGrid.style.display === 'none'
        filterGrid.style.display = isHidden ? '' : 'none'
        toggleFiltersBtn.textContent = isHidden ? 'Hide filters' : 'Show filters'
      })
    }

    document.getElementById('jumpToBoardBtn').addEventListener('click', () => {
      setActivePage('pageBoard')
      window.requestAnimationFrame(() => {
        document.getElementById('boardAnchor').scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    document.getElementById('profileModalClose').addEventListener('click', closeProfile)
    document.getElementById('profileModalBack').addEventListener('click', (event) => {
      if (event.target.id === 'profileModalBack') {
        closeProfile()
      }
    })

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.profileOpen) {
        closeProfile()
      }
    })

    renderAll()
  }

  window.addEventListener('DOMContentLoaded', initControls)
})()
