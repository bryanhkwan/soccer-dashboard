import { useDeferredValue, useEffect, useState } from 'react'
import './App.css'
import { macDataset } from './data/macDataset'
import type { MacPlayer } from './data/macTypes'

type PositionFilter = 'All' | 'FWD' | 'MID' | 'DEF' | 'GK' | 'UTIL'
type ClassFilter = 'All' | 'Fr' | 'So' | 'Jr' | 'Sr' | 'Grad' | 'Other'
type StatsFilter = 'All' | 'With stats' | 'Roster only'
type SortKey =
  | 'points'
  | 'goals'
  | 'assists'
  | 'minutes'
  | 'shots'
  | 'saves'
  | 'savePct'
  | 'gaa'

const wholeNumber = new Intl.NumberFormat('en-US')
const threeDecimals = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

const positionOptions: PositionFilter[] = ['All', 'FWD', 'MID', 'DEF', 'GK', 'UTIL']
const classOptions: ClassFilter[] = ['All', 'Fr', 'So', 'Jr', 'Sr', 'Grad', 'Other']
const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: 'points', label: 'Points' },
  { value: 'goals', label: 'Goals' },
  { value: 'assists', label: 'Assists' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'shots', label: 'Shots' },
  { value: 'saves', label: 'Saves' },
  { value: 'savePct', label: 'Save %' },
  { value: 'gaa', label: 'GAA' },
]

const players = macDataset.players
const teams = macDataset.teams
const schoolOptions = ['All', ...teams.map((team) => team.name).sort((left, right) => left.localeCompare(right))]
const generatedLabel = new Date(macDataset.generatedAt).toLocaleString('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function getPlayerMinutes(player: MacPlayer) {
  return player.goalkeepingStats?.minutes ?? player.offensiveStats.minutes
}

function getPlayerGames(player: MacPlayer) {
  return player.goalkeepingStats?.games ?? player.offensiveStats.games
}

function getPlayerStarts(player: MacPlayer) {
  return player.goalkeepingStats?.starts ?? player.offensiveStats.starts
}

function getSortValue(player: MacPlayer, sortKey: SortKey) {
  if (sortKey === 'points') {
    return player.offensiveStats.points
  }

  if (sortKey === 'goals') {
    return player.offensiveStats.goals
  }

  if (sortKey === 'assists') {
    return player.offensiveStats.assists
  }

  if (sortKey === 'minutes') {
    return getPlayerMinutes(player)
  }

  if (sortKey === 'shots') {
    return player.offensiveStats.shots
  }

  if (sortKey === 'saves') {
    return player.goalkeepingStats?.saves ?? -1
  }

  if (sortKey === 'savePct') {
    return player.goalkeepingStats?.savePct ?? -1
  }

  return player.goalkeepingStats?.goalsAgainstAverage ?? Number.POSITIVE_INFINITY
}

function formatRate(value: number | null) {
  if (value === null) {
    return 'N/A'
  }

  return threeDecimals.format(value)
}

function formatStatus(player: MacPlayer) {
  return player.hasSeasonStats ? 'Stats' : 'Roster only'
}

function getPrimaryLine(player: MacPlayer) {
  if (player.positionGroup === 'GK' && player.goalkeepingStats) {
    return `${wholeNumber.format(player.goalkeepingStats.saves)} SV`
  }

  return `${player.offensiveStats.goals} G / ${player.offensiveStats.assists} A`
}

function getSecondaryLine(player: MacPlayer) {
  if (player.positionGroup === 'GK' && player.goalkeepingStats) {
    return `${formatRate(player.goalkeepingStats.savePct)} SV%`
  }

  return `${wholeNumber.format(player.offensiveStats.points)} PTS`
}

function getHeadline(player: MacPlayer) {
  if (player.positionGroup === 'GK' && player.goalkeepingStats) {
    return `${wholeNumber.format(player.goalkeepingStats.shutouts)} shutouts`
  }

  return `${wholeNumber.format(player.offensiveStats.points)} total points`
}

function getScoreCard(player: MacPlayer) {
  if (player.positionGroup === 'GK' && player.goalkeepingStats) {
    return {
      label: 'Save %',
      value: formatRate(player.goalkeepingStats.savePct),
    }
  }

  return {
    label: 'Points',
    value: wholeNumber.format(player.offensiveStats.points),
  }
}

function getDetailStats(player: MacPlayer) {
  if (player.positionGroup === 'GK' && player.goalkeepingStats) {
    return [
      { label: 'Games', value: wholeNumber.format(player.goalkeepingStats.games) },
      { label: 'Starts', value: wholeNumber.format(player.goalkeepingStats.starts) },
      { label: 'Minutes', value: wholeNumber.format(player.goalkeepingStats.minutes) },
      { label: 'Saves', value: wholeNumber.format(player.goalkeepingStats.saves) },
      { label: 'Save %', value: formatRate(player.goalkeepingStats.savePct) },
      { label: 'GAA', value: formatRate(player.goalkeepingStats.goalsAgainstAverage) },
    ]
  }

  return [
    { label: 'Games', value: wholeNumber.format(player.offensiveStats.games) },
    { label: 'Starts', value: wholeNumber.format(player.offensiveStats.starts) },
    { label: 'Minutes', value: wholeNumber.format(player.offensiveStats.minutes) },
    { label: 'Goals', value: wholeNumber.format(player.offensiveStats.goals) },
    { label: 'Assists', value: wholeNumber.format(player.offensiveStats.assists) },
    { label: 'Points', value: wholeNumber.format(player.offensiveStats.points) },
  ]
}

function getProfileLines(player: MacPlayer) {
  if (player.positionGroup === 'GK' && player.goalkeepingStats) {
    return [
      `W-L-T: ${player.goalkeepingStats.wins}-${player.goalkeepingStats.losses}-${player.goalkeepingStats.ties}`,
      `Goals against: ${wholeNumber.format(player.goalkeepingStats.goalsAgainst)}`,
      `Shots faced: ${wholeNumber.format(player.goalkeepingStats.shotsFaced)}`,
      `Shutouts: ${wholeNumber.format(player.goalkeepingStats.shutouts)}`,
    ]
  }

  return [
    `Shots: ${wholeNumber.format(player.offensiveStats.shots)}`,
    `Shots on goal: ${wholeNumber.format(player.offensiveStats.shotsOnGoal)}`,
    `Shot %: ${formatRate(player.offensiveStats.shotPct)}`,
    `SOG %: ${formatRate(player.offensiveStats.shotsOnGoalPct)}`,
    `Cards: ${player.offensiveStats.yellowCards}-${player.offensiveStats.redCards}`,
    `Game winners: ${wholeNumber.format(player.offensiveStats.gameWinners)}`,
  ]
}

function App() {
  const [searchValue, setSearchValue] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('All')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('All')
  const [classFilter, setClassFilter] = useState<ClassFilter>('All')
  const [statsFilter, setStatsFilter] = useState<StatsFilter>('With stats')
  const [sortKey, setSortKey] = useState<SortKey>('points')
  const [minimumMinutes, setMinimumMinutes] = useState(250)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    players.find((player) => player.hasSeasonStats)?.id ?? players[0]?.id ?? null,
  )

  const deferredSearch = useDeferredValue(searchValue)
  const normalizedSearch = deferredSearch.trim().toLowerCase()

  const filteredPlayers = [...players]
    .filter((player) => {
      const haystack = [
        player.name,
        player.teamName,
        player.position,
        player.positionGroup,
        player.classYear,
        player.hometown,
        player.highSchool,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        normalizedSearch.length === 0 || haystack.includes(normalizedSearch)
      const matchesSchool = schoolFilter === 'All' || player.teamName === schoolFilter
      const matchesPosition =
        positionFilter === 'All' || player.positionGroup === positionFilter
      const matchesClass =
        classFilter === 'All' || player.classYearShort === classFilter
      const matchesStats =
        statsFilter === 'All' ||
        (statsFilter === 'With stats' && player.hasSeasonStats) ||
        (statsFilter === 'Roster only' && !player.hasSeasonStats)
      const matchesMinutes = getPlayerMinutes(player) >= minimumMinutes

      return (
        matchesSearch &&
        matchesSchool &&
        matchesPosition &&
        matchesClass &&
        matchesStats &&
        matchesMinutes
      )
    })
    .sort((left, right) => {
      if (sortKey === 'gaa') {
        const leftValue = getSortValue(left, sortKey)
        const rightValue = getSortValue(right, sortKey)

        if (leftValue !== rightValue) {
          return leftValue - rightValue
        }
      } else {
        const leftValue = getSortValue(left, sortKey)
        const rightValue = getSortValue(right, sortKey)

        if (rightValue !== leftValue) {
          return rightValue - leftValue
        }
      }

      return left.name.localeCompare(right.name)
    })

  useEffect(() => {
    if (!filteredPlayers.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(filteredPlayers[0]?.id ?? null)
    }
  }, [filteredPlayers, selectedPlayerId])

  const selectedPlayer =
    filteredPlayers.find((player) => player.id === selectedPlayerId) ?? null

  const rosterOnlyCount = players.filter((player) => !player.hasSeasonStats).length
  const goalkeeperCount = players.filter((player) => player.positionGroup === 'GK').length
  const averageRosterSize = Math.round(players.length / teams.length)

  const leaderCards = [
    {
      title: 'Points leader',
      metric: 'PTS',
      player: [...players]
        .filter((player) => player.hasSeasonStats && player.positionGroup !== 'GK')
        .sort(
          (left, right) =>
            right.offensiveStats.points - left.offensiveStats.points ||
            right.offensiveStats.goals - left.offensiveStats.goals,
        )[0],
      value: (player: MacPlayer) => wholeNumber.format(player.offensiveStats.points),
    },
    {
      title: 'Goal leader',
      metric: 'GOALS',
      player: [...players]
        .filter((player) => player.hasSeasonStats && player.positionGroup !== 'GK')
        .sort(
          (left, right) =>
            right.offensiveStats.goals - left.offensiveStats.goals ||
            right.offensiveStats.points - left.offensiveStats.points,
        )[0],
      value: (player: MacPlayer) => wholeNumber.format(player.offensiveStats.goals),
    },
    {
      title: 'Assist leader',
      metric: 'AST',
      player: [...players]
        .filter((player) => player.hasSeasonStats && player.positionGroup !== 'GK')
        .sort(
          (left, right) =>
            right.offensiveStats.assists - left.offensiveStats.assists ||
            right.offensiveStats.points - left.offensiveStats.points,
        )[0],
      value: (player: MacPlayer) => wholeNumber.format(player.offensiveStats.assists),
    },
    {
      title: 'Save leader',
      metric: 'SAVES',
      player: [...players]
        .filter(
          (player) =>
            player.positionGroup === 'GK' && (player.goalkeepingStats?.minutes ?? 0) >= 450,
        )
        .sort(
          (left, right) =>
            (right.goalkeepingStats?.saves ?? 0) - (left.goalkeepingStats?.saves ?? 0),
        )[0],
      value: (player: MacPlayer) =>
        wholeNumber.format(player.goalkeepingStats?.saves ?? 0),
    },
  ].filter((card) => card.player)

  const schoolPipeline = teams
    .map((team) => {
      const scoped = filteredPlayers.filter((player) => player.teamId === team.id)
      const statCount = scoped.filter((player) => player.hasSeasonStats).length

      return {
        school: team.name,
        count: scoped.length,
        statCount,
      }
    })
    .filter((school) => school.count > 0)
    .sort((left, right) => right.count - left.count || right.statCount - left.statCount)

  const maxSchoolCount = Math.max(...schoolPipeline.map((school) => school.count), 1)

  return (
    <main className="app-shell">
      <section className="panel hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Frontend phase 1</p>
          <h1>MAC Women&apos;s Soccer Player Board</h1>
          <p className="hero-text">
            Local prototype built from public 2025 roster and cumulative stat
            pages for all 13 MAC programs. This gives you a real player pool to
            pressure-test the frontend before deciding whether to build a
            backend.
          </p>
          <div className="status-row">
            <span className="status-pill status-pill--accent">MAC only</span>
            <span className="status-pill">{macDataset.season} season</span>
            <span className="status-pill">Generated {generatedLabel}</span>
          </div>
        </div>

        <div className="need-grid">
          <article className="need-card">
            <p className="need-kicker">Coverage</p>
            <h2>{wholeNumber.format(macDataset.coverage.teamsSucceeded)} schools</h2>
            <p>Every current MAC women&apos;s soccer program is included in this build.</p>
          </article>
          <article className="need-card">
            <p className="need-kicker">Player pool</p>
            <h2>{wholeNumber.format(macDataset.coverage.playerCount)} players</h2>
            <p>
              {wholeNumber.format(macDataset.coverage.playersWithStats)} have
              season stat lines and {wholeNumber.format(rosterOnlyCount)} are
              roster-only.
            </p>
          </article>
          <article className="need-card">
            <p className="need-kicker">Important note</p>
            <h2>Public data only</h2>
            <p>This does not confirm transfer status or portal availability.</p>
          </article>
        </div>
      </section>

      <section className="overview-grid">
        <article className="panel stat-card">
          <p className="eyebrow">Player pool</p>
          <strong>{wholeNumber.format(players.length)}</strong>
          <span>MAC roster entries in this local dataset</span>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Stat lines</p>
          <strong>{wholeNumber.format(macDataset.coverage.playersWithStats)}</strong>
          <span>Players with public cumulative stats</span>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Goalkeepers</p>
          <strong>{wholeNumber.format(goalkeeperCount)}</strong>
          <span>Rostered keepers across the conference</span>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Avg roster</p>
          <strong>{wholeNumber.format(averageRosterSize)}</strong>
          <span>Approximate players per school in this scrape</span>
        </article>
      </section>

      <section className="board-layout">
        <div className="board-main">
          <section className="panel filters-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Filters</p>
                <h2>Search the MAC player pool</h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setSearchValue('')
                  setSchoolFilter('All')
                  setPositionFilter('All')
                  setClassFilter('All')
                  setStatsFilter('With stats')
                  setSortKey('points')
                  setMinimumMinutes(250)
                }}
              >
                Reset
              </button>
            </div>

            <div className="filters-grid">
              <label className="field">
                <span>Search</span>
                <input
                  type="search"
                  value={searchValue}
                  placeholder="Player, school, hometown, high school..."
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>

              <label className="field">
                <span>School</span>
                <select
                  value={schoolFilter}
                  onChange={(event) => setSchoolFilter(event.target.value)}
                >
                  {schoolOptions.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Class</span>
                <select
                  value={classFilter}
                  onChange={(event) =>
                    setClassFilter(event.target.value as ClassFilter)
                  }
                >
                  {classOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Sort by</span>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="toolbar">
              <div className="position-toggle" role="tablist" aria-label="Position filter">
                {positionOptions.map((position) => (
                  <button
                    key={position}
                    type="button"
                    className={
                      position === positionFilter
                        ? 'toggle-button toggle-button--active'
                        : 'toggle-button'
                    }
                    onClick={() => setPositionFilter(position)}
                  >
                    {position === 'UTIL' ? 'Hybrid' : position}
                  </button>
                ))}
              </div>

              <label className="slider-field">
                <span>Minimum minutes</span>
                <strong>{wholeNumber.format(minimumMinutes)}</strong>
                <input
                  type="range"
                  min="0"
                  max="1800"
                  step="90"
                  value={minimumMinutes}
                  onChange={(event) => setMinimumMinutes(Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Stat coverage</span>
                <select
                  value={statsFilter}
                  onChange={(event) =>
                    setStatsFilter(event.target.value as StatsFilter)
                  }
                >
                  <option value="With stats">With stats</option>
                  <option value="All">All players</option>
                  <option value="Roster only">Roster only</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel board-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Player board</p>
                <h2>MAC roster and cumulative stat view</h2>
              </div>
              <p className="results-count">
                {wholeNumber.format(filteredPlayers.length)} matches
              </p>
            </div>

            <div className="player-grid player-grid--head" aria-hidden="true">
              <span>Player</span>
              <span>School</span>
              <span>Pos</span>
              <span>Class</span>
              <span>Min</span>
              <span>Primary</span>
              <span>Metric</span>
              <span>Status</span>
            </div>

            <div className="player-list">
              {filteredPlayers.length === 0 ? (
                <div className="empty-state">
                  <h3>No players match these filters</h3>
                  <p>Broaden the search or lower the minutes floor to reopen the pool.</p>
                </div>
              ) : (
                filteredPlayers.map((player) => {
                  const isSelected = player.id === selectedPlayerId

                  return (
                    <button
                      key={player.id}
                      type="button"
                      className={
                        isSelected
                          ? 'player-grid player-row player-row--active'
                          : 'player-grid player-row'
                      }
                      onClick={() => setSelectedPlayerId(player.id)}
                    >
                      <span className="player-primary">
                        <strong>{player.name}</strong>
                        <small>
                          {player.hometown} | {player.highSchool}
                        </small>
                      </span>
                      <span>{player.teamName}</span>
                      <span>{player.positionGroup}</span>
                      <span>{player.classYearShort}</span>
                      <span>{wholeNumber.format(getPlayerMinutes(player))}</span>
                      <span>{getPrimaryLine(player)}</span>
                      <span>{getSecondaryLine(player)}</span>
                      <span
                        className={
                          player.hasSeasonStats ? 'fit-pill' : 'status-pill'
                        }
                      >
                        {formatStatus(player)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className="panel shortlist-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Leader lanes</p>
                <h2>Quick entry points into the MAC data</h2>
              </div>
            </div>

            <div className="shortlist-grid">
              {leaderCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  className="shortlist-card"
                  onClick={() => setSelectedPlayerId(card.player.id)}
                >
                  <span className="shortlist-tier">{card.metric}</span>
                  <strong>{card.player.name}</strong>
                  <span>
                    {card.player.teamName} | {card.player.positionGroup}
                  </span>
                  <p>
                    {card.title}: {card.value(card.player)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="board-side">
          <section className="panel detail-panel">
            {selectedPlayer ? (
              <>
                <div className="detail-top">
                  <div>
                    <p className="eyebrow">Selected player</p>
                    <h2>{selectedPlayer.name}</h2>
                    <p className="detail-meta">
                      {selectedPlayer.teamName} | {selectedPlayer.position} |{' '}
                      {selectedPlayer.classYear} | {selectedPlayer.hometown}
                    </p>
                  </div>
                  <div className="detail-score">
                    <span>{getScoreCard(selectedPlayer).label}</span>
                    <strong>{getScoreCard(selectedPlayer).value}</strong>
                  </div>
                </div>

                <div className="detail-badges">
                  <span className="status-pill status-pill--accent">
                    {formatStatus(selectedPlayer)}
                  </span>
                  <span className="status-pill">#{selectedPlayer.jersey}</span>
                  <span className="status-pill">{selectedPlayer.height}</span>
                  <span className="status-pill">{getHeadline(selectedPlayer)}</span>
                </div>

                <p className="detail-summary">
                  {selectedPlayer.hometown} | {selectedPlayer.highSchool}
                </p>
                <p className="detail-projection">
                  Public cumulative stats can help you judge production, but
                  this view does not say whether the player is actually in the
                  portal.
                </p>

                <div className="detail-stats">
                  {getDetailStats(selectedPlayer).map((stat) => (
                    <article key={stat.label} className="detail-stat">
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="detail-section">
                  <p className="eyebrow">Season line</p>
                  <ul className="detail-list">
                    {getProfileLines(selectedPlayer).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="detail-section">
                  <p className="eyebrow">Profile</p>
                  <ul className="detail-list">
                    <li>School: {selectedPlayer.teamName}</li>
                    <li>Class: {selectedPlayer.classYear}</li>
                    <li>Games / starts: {getPlayerGames(selectedPlayer)} / {getPlayerStarts(selectedPlayer)}</li>
                    <li>Roster source: public school athletics site</li>
                  </ul>
                </div>

                <div className="detail-links">
                  {selectedPlayer.rosterUrl ? (
                    <a
                      className="ghost-button"
                      href={selectedPlayer.rosterUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open roster page
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="empty-state empty-state--detail">
                <h3>No player selected</h3>
                <p>Adjust the filters or choose a player from the board.</p>
              </div>
            )}
          </section>

          <section className="panel pipeline-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">School coverage</p>
                <h2>Where the filtered pool is concentrated</h2>
              </div>
            </div>

            <div className="pipeline-list">
              {schoolPipeline.map((school) => (
                <article key={school.school} className="pipeline-row">
                  <div className="pipeline-labels">
                    <strong>{school.school}</strong>
                    <span>
                      {school.count} players | {school.statCount} with stats
                    </span>
                  </div>
                  <div className="pipeline-bar">
                    <span
                      style={{
                        width: `${(school.count / maxSchoolCount) * 100}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>

            <p className="pipeline-note">
              Built from public school roster and cumulative stat pages. This
              helps you evaluate output, but it is not a transfer portal feed.
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
