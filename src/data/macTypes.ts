export interface MacTeam {
  id: string
  name: string
  conference: string
  domain: string
  rosterUrl: string
  statsUrl: string
  playerCount: number
}

export interface FieldStats {
  games: number
  starts: number
  minutes: number
  minutesRaw: string
  goals: number
  assists: number
  points: number
  shots: number
  shotPct: number | null
  shotsOnGoal: number
  shotsOnGoalPct: number | null
  yellowCards: number
  redCards: number
  gameWinners: number
  penaltyGoals: number
  penaltyAttempts: number
}

export interface GoalkeepingStats {
  games: number
  starts: number
  minutes: number
  minutesRaw: string
  goalsAgainst: number
  goalsAgainstAverage: number | null
  saves: number
  savePct: number | null
  wins: number
  losses: number
  ties: number
  shutouts: number
  shotsFaced: number
}

export interface MacPlayer {
  id: string
  teamId: string
  teamName: string
  name: string
  slug: string
  rosterUrl: string
  position: string
  positionGroup: 'GK' | 'DEF' | 'MID' | 'FWD' | 'UTIL'
  classYear: string
  classYearShort: 'Fr' | 'So' | 'Jr' | 'Sr' | 'Grad' | 'Other'
  hometown: string
  highSchool: string
  height: string
  jersey: string
  hasSeasonStats: boolean
  offensiveStats: FieldStats
  goalkeepingStats: GoalkeepingStats | null
}

export interface MacDatasetCoverage {
  teamsRequested: number
  teamsSucceeded: number
  rosterCount: number
  playerCount: number
  playersWithStats: number
  goalkeeperCount: number
}

export interface MacDataset {
  generatedAt: string
  season: string
  conference: string
  teams: MacTeam[]
  players: MacPlayer[]
  coverage: MacDatasetCoverage
}
