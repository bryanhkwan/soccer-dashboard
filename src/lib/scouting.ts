import { teams, type Player } from '../data/scoutingData'

export const positionOptions = ['All', 'FWD', 'MID', 'DEF', 'GK'] as const
export const classOptions = ['All', 'Fr', 'So', 'Jr', 'Sr', 'Grad'] as const
export const sortOptions = [
  { value: 'fit', label: 'Fit score' },
  { value: 'points', label: 'Points' },
  { value: 'goals', label: 'Goals' },
  { value: 'chances', label: 'Chance creation' },
  { value: 'defending', label: 'Defending volume' },
  { value: 'goalkeeping', label: 'Goalkeeping value' },
  { value: 'minutes', label: 'Minutes' },
] as const

export type PositionFilter = (typeof positionOptions)[number]
export type ClassFilter = (typeof classOptions)[number]
export type SortKey = (typeof sortOptions)[number]['value']

export const teamById = new Map(teams.map((team) => [team.id, team] as const))
export const wholeNumber = new Intl.NumberFormat('en-US')
export const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export function getTeam(player: Player) {
  return teamById.get(player.teamId)
}

export function getPoints(player: Player) {
  return player.goals * 2 + player.assists
}

export function getShotAccuracy(player: Player) {
  if (player.shots === 0) {
    return 0
  }

  return player.shotsOnGoal / player.shots
}

export function getDefendingVolume(player: Player) {
  return player.interceptions + player.clearances
}

export function getGoalkeepingValue(player: Player) {
  if (!player.goalkeeperStats) {
    return 0
  }

  return player.goalkeeperStats.savePct * 100 + player.goalkeeperStats.cleanSheets
}

export function formatPercentage(value: number) {
  return percentFormat.format(value)
}
