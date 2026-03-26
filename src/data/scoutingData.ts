export type Position = 'FWD' | 'MID' | 'DEF' | 'GK'
export type ClassYear = 'Fr' | 'So' | 'Jr' | 'Sr' | 'Grad'
export type ScoutingTier = 'Priority' | 'Strong' | 'Watch'

export interface Team {
  id: string
  name: string
  conference: string
}

export interface MatchLine {
  opponent: string
  result: string
  minutes: number
  goals: number
  assists: number
  notes: string
}

export interface GoalkeeperStats {
  saves: number
  savePct: number
  cleanSheets: number
  longPassAccuracy: number
}

export interface Player {
  id: string
  name: string
  teamId: string
  position: Position
  classYear: ClassYear
  hometown: string
  height: string
  dominantFoot: 'Left' | 'Right' | 'Both'
  games: number
  starts: number
  minutes: number
  goals: number
  assists: number
  shots: number
  shotsOnGoal: number
  chancesCreated: number
  interceptions: number
  clearances: number
  fitScore: number
  scoutingTier: ScoutingTier
  projection: string
  summary: string
  tags: string[]
  notes: string[]
  recentMatches: MatchLine[]
  goalkeeperStats?: GoalkeeperStats
}

export const seasonLabel = '2025 MAC seeded scouting prototype'

export const recruitingNeeds = [
  {
    id: 'wing',
    title: 'Explosive Wide Threat',
    description:
      'A winger who stretches back lines, wins 1v1s, and can start on day one.',
  },
  {
    id: 'midfield',
    title: 'Two-Way Midfielder',
    description:
      'Need a connector who can progress play and still survive the transition game.',
  },
  {
    id: 'goalkeeper',
    title: 'Distribution-First Keeper',
    description:
      'Ideal keeper protects space and starts counters instead of only ending attacks.',
  },
] as const

export const teams: Team[] = [
  { id: 'western-michigan', name: 'Western Michigan', conference: 'MAC' },
  { id: 'buffalo', name: 'Buffalo', conference: 'MAC' },
  { id: 'ohio', name: 'Ohio', conference: 'MAC' },
  { id: 'umass', name: 'UMass', conference: 'MAC' },
  { id: 'bowling-green', name: 'Bowling Green', conference: 'MAC' },
  { id: 'kent-state', name: 'Kent State', conference: 'MAC' },
  { id: 'miami', name: 'Miami', conference: 'MAC' },
  { id: 'northern-illinois', name: 'Northern Illinois', conference: 'MAC' },
  { id: 'eastern-michigan', name: 'Eastern Michigan', conference: 'MAC' },
  { id: 'toledo', name: 'Toledo', conference: 'MAC' },
  { id: 'ball-state', name: 'Ball State', conference: 'MAC' },
  { id: 'central-michigan', name: 'Central Michigan', conference: 'MAC' },
]

export const players: Player[] = [
  {
    id: 'maya-thornton',
    name: 'Maya Thornton',
    teamId: 'western-michigan',
    position: 'FWD',
    classYear: 'Jr',
    hometown: 'Frisco, TX',
    height: `5'8"`,
    dominantFoot: 'Right',
    games: 22,
    starts: 21,
    minutes: 1640,
    goals: 14,
    assists: 7,
    shots: 62,
    shotsOnGoal: 33,
    chancesCreated: 44,
    interceptions: 11,
    clearances: 8,
    fitScore: 94,
    scoutingTier: 'Priority',
    projection: 'Day-one starter on either wing in a front three.',
    summary:
      'Vertical attacker who can isolate fullbacks and still connect short combinations.',
    tags: ['Wide 1v1 threat', 'Back-post runner', 'Press-resistant carry'],
    notes: [
      'Best instant chance-volume option in the prototype pool.',
      'Looks even better if the system gives her space to start wide.',
    ],
    recentMatches: [
      {
        opponent: 'Duke',
        result: 'W 2-1',
        minutes: 86,
        goals: 1,
        assists: 1,
        notes: 'Created the winner after repeated success from the right side.',
      },
      {
        opponent: 'North Carolina',
        result: 'D 1-1',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Still generated four shots against a compact back line.',
      },
    ],
  },
  {
    id: 'gianna-perez',
    name: 'Gianna Perez',
    teamId: 'buffalo',
    position: 'MID',
    classYear: 'Sr',
    hometown: 'Hialeah, FL',
    height: `5'6"`,
    dominantFoot: 'Both',
    games: 23,
    starts: 23,
    minutes: 1885,
    goals: 6,
    assists: 10,
    shots: 41,
    shotsOnGoal: 19,
    chancesCreated: 61,
    interceptions: 32,
    clearances: 18,
    fitScore: 92,
    scoutingTier: 'Priority',
    projection: 'Tempo-setting 8/10 who can raise the whole midfield floor.',
    summary:
      'High-volume midfielder with final-pass quality and enough bite to survive without the ball.',
    tags: ['Chance creator', 'Press breaker', 'Late box runner'],
    notes: [
      'Cleanest all-around midfielder in the seeded group.',
      'Fits both high-possession and transition-heavy teams.',
    ],
    recentMatches: [
      {
        opponent: 'Virginia',
        result: 'W 3-2',
        minutes: 88,
        goals: 1,
        assists: 1,
        notes: 'Owned the tempo after halftime and slipped runners behind the line.',
      },
      {
        opponent: 'Louisville',
        result: 'W 1-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Recovered loose balls and kept Pitt on the front foot.',
      },
    ],
  },
  {
    id: 'olivia-cormier',
    name: 'Olivia Cormier',
    teamId: 'ohio',
    position: 'DEF',
    classYear: 'Jr',
    hometown: 'Metairie, LA',
    height: `5'10"`,
    dominantFoot: 'Right',
    games: 22,
    starts: 22,
    minutes: 1920,
    goals: 3,
    assists: 4,
    shots: 18,
    shotsOnGoal: 9,
    chancesCreated: 14,
    interceptions: 49,
    clearances: 88,
    fitScore: 90,
    scoutingTier: 'Priority',
    projection: 'Immediate starting center back with leadership upside.',
    summary:
      'Front-foot defender who wins first contact and can punch firm passes through lines.',
    tags: ['Aerial control', 'Recovery pace', 'Line-breaking passing'],
    notes: [
      'Best defensive floor in the prototype because the habits are already mature.',
      'Would raise the level of a back line that needs communication and structure.',
    ],
    recentMatches: [
      {
        opponent: 'Clemson',
        result: 'W 1-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Dominated the box and erased most second-ball danger.',
      },
      {
        opponent: 'Virginia Tech',
        result: 'W 2-1',
        minutes: 90,
        goals: 1,
        assists: 0,
        notes: 'Scored on a set piece and still handled transition moments well.',
      },
    ],
  },
  {
    id: 'lena-kessler',
    name: 'Lena Kessler',
    teamId: 'umass',
    position: 'GK',
    classYear: 'Sr',
    hometown: 'Laguna Niguel, CA',
    height: `5'11"`,
    dominantFoot: 'Right',
    games: 21,
    starts: 21,
    minutes: 1890,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnGoal: 0,
    chancesCreated: 0,
    interceptions: 0,
    clearances: 0,
    fitScore: 91,
    scoutingTier: 'Priority',
    projection: 'Starter-grade keeper who lifts the floor of possession immediately.',
    summary:
      'Sweeper-keeper profile with calm distribution and enough range to protect a high line.',
    tags: ['Sweeper range', 'Cross management', 'Distribution'],
    notes: [
      'Best backend-ready keeper if the staff values build-up and command together.',
      'Looks like the cleanest tactical fit for front-foot teams.',
    ],
    recentMatches: [
      {
        opponent: 'Portland',
        result: 'W 1-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Claimed late service and hit two clean release balls.',
      },
      {
        opponent: 'Pepperdine',
        result: 'D 0-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Quiet game, but her starting positions erased through-ball danger.',
      },
    ],
    goalkeeperStats: {
      saves: 86,
      savePct: 0.846,
      cleanSheets: 10,
      longPassAccuracy: 67,
    },
  },
  {
    id: 'brooke-halston',
    name: 'Brooke Halston',
    teamId: 'bowling-green',
    position: 'FWD',
    classYear: 'So',
    hometown: 'Mobile, AL',
    height: `5'7"`,
    dominantFoot: 'Left',
    games: 20,
    starts: 20,
    minutes: 1578,
    goals: 13,
    assists: 4,
    shots: 58,
    shotsOnGoal: 29,
    chancesCreated: 27,
    interceptions: 7,
    clearances: 5,
    fitScore: 88,
    scoutingTier: 'Strong',
    projection: 'High-upside scorer who can grow into a featured transition role.',
    summary:
      'Power runner with a left-footed release and enough off-ball timing to scare compact lines.',
    tags: ['Transition threat', 'Left-footed finisher', 'Channel runner'],
    notes: [
      'More direct than polished right now, but the scoring ceiling is real.',
      'Could pop in a team that creates cleaner service.',
    ],
    recentMatches: [
      {
        opponent: 'Arkansas',
        result: 'W 2-1',
        minutes: 82,
        goals: 1,
        assists: 0,
        notes: 'Won the game by exploding through the inside-left lane late.',
      },
      {
        opponent: 'Ole Miss',
        result: 'L 1-2',
        minutes: 90,
        goals: 1,
        assists: 0,
        notes: 'Still found a goal on limited touches and attacked the box relentlessly.',
      },
    ],
  },
  {
    id: 'naomi-vega',
    name: 'Naomi Vega',
    teamId: 'kent-state',
    position: 'MID',
    classYear: 'Grad',
    hometown: 'Phoenix, AZ',
    height: `5'5"`,
    dominantFoot: 'Right',
    games: 21,
    starts: 21,
    minutes: 1762,
    goals: 5,
    assists: 9,
    shots: 35,
    shotsOnGoal: 15,
    chancesCreated: 54,
    interceptions: 36,
    clearances: 22,
    fitScore: 89,
    scoutingTier: 'Strong',
    projection: 'Experienced connector who can stabilize a midfield room fast.',
    summary:
      'Balanced midfielder with clean receiving angles and strong counterpress reactions.',
    tags: ['Two-way engine', 'Service quality', 'Counterpress'],
    notes: [
      'Strong option if you need maturity and 90-minute reliability.',
      'Not as dynamic as the top tier, but the role fit is easy to imagine.',
    ],
    recentMatches: [
      {
        opponent: 'Penn State',
        result: 'W 2-0',
        minutes: 90,
        goals: 0,
        assists: 1,
        notes: 'Created the opener and spent the second half closing passing lanes.',
      },
      {
        opponent: 'Michigan State',
        result: 'D 1-1',
        minutes: 88,
        goals: 1,
        assists: 0,
        notes: 'Arrived late into the box and still finished with seven recoveries.',
      },
    ],
  },
  {
    id: 'talia-brooks',
    name: 'Talia Brooks',
    teamId: 'miami',
    position: 'DEF',
    classYear: 'Sr',
    hometown: 'Bowie, MD',
    height: `5'9"`,
    dominantFoot: 'Both',
    games: 22,
    starts: 22,
    minutes: 1980,
    goals: 1,
    assists: 5,
    shots: 12,
    shotsOnGoal: 4,
    chancesCreated: 19,
    interceptions: 44,
    clearances: 104,
    fitScore: 87,
    scoutingTier: 'Strong',
    projection: 'Reliable center back for a program that needs secure defending now.',
    summary:
      'Physical defender with elite ball-winning numbers and enough range to cover a proactive line.',
    tags: ['Duel winner', 'Back-post defender', 'Emergency speed'],
    notes: [
      'Safest defensive floor if your staff values repeatable basics over flash.',
      'Would fit a team that defends the box often and still needs transition cover.',
    ],
    recentMatches: [
      {
        opponent: 'Xavier',
        result: 'W 1-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Won everything in the air and snuffed out late counters.',
      },
      {
        opponent: 'Marquette',
        result: 'W 2-1',
        minutes: 90,
        goals: 0,
        assists: 1,
        notes: 'Started the equalizer with a diagonal and carried heavy defensive volume.',
      },
    ],
  },
  {
    id: 'reese-holloway',
    name: 'Reese Holloway',
    teamId: 'northern-illinois',
    position: 'FWD',
    classYear: 'So',
    hometown: 'Louisville, KY',
    height: `5'9"`,
    dominantFoot: 'Both',
    games: 18,
    starts: 16,
    minutes: 1288,
    goals: 11,
    assists: 3,
    shots: 45,
    shotsOnGoal: 22,
    chancesCreated: 21,
    interceptions: 6,
    clearances: 4,
    fitScore: 90,
    scoutingTier: 'Priority',
    projection: 'Finisher with enough athletic pop to raise the ceiling of a front line.',
    summary:
      'Direct scorer who attacks central channels fast and makes aggressive near-post runs.',
    tags: ['Box scorer', 'Explosive first step', 'Dual-foot finish'],
    notes: [
      'Not the most complete creator, but the goal profile is immediately useful.',
      'Could thrive if your team already has midfield service and needs a ruthless end-point.',
    ],
    recentMatches: [
      {
        opponent: 'Syracuse',
        result: 'W 2-0',
        minutes: 81,
        goals: 2,
        assists: 0,
        notes: 'Looked decisive in the box and converted both high-value chances.',
      },
      {
        opponent: 'Florida State',
        result: 'L 0-1',
        minutes: 74,
        goals: 0,
        assists: 0,
        notes: 'Still found dangerous pockets even though Clemson struggled to connect play.',
      },
    ],
  },
  {
    id: 'kira-lawson',
    name: 'Kira Lawson',
    teamId: 'eastern-michigan',
    position: 'MID',
    classYear: 'Jr',
    hometown: 'Nashville, TN',
    height: `5'8"`,
    dominantFoot: 'Right',
    games: 20,
    starts: 20,
    minutes: 1710,
    goals: 4,
    assists: 11,
    shots: 29,
    shotsOnGoal: 13,
    chancesCreated: 67,
    interceptions: 31,
    clearances: 14,
    fitScore: 91,
    scoutingTier: 'Priority',
    projection: 'Chance-making midfielder who can become a system centerpiece.',
    summary:
      'Creative eight with real volume and the bravery to play through traffic.',
    tags: ['Final-third orchestration', 'Tempo shifts', 'Half-space service'],
    notes: [
      'Purest creator in the pool if your roster needs assists more than goals.',
      'Film would matter here because she can look even better in a more technical side.',
    ],
    recentMatches: [
      {
        opponent: 'Tennessee',
        result: 'W 2-1',
        minutes: 87,
        goals: 0,
        assists: 2,
        notes: 'Created both goals with early service before the defense could set.',
      },
      {
        opponent: 'Texas A&M',
        result: 'D 1-1',
        minutes: 90,
        goals: 1,
        assists: 0,
        notes: 'Also showed she can arrive from midfield when teams overplay the pass.',
      },
    ],
  },
  {
    id: 'addison-hart',
    name: 'Addison Hart',
    teamId: 'toledo',
    position: 'DEF',
    classYear: 'Grad',
    hometown: 'Plano, TX',
    height: `5'11"`,
    dominantFoot: 'Right',
    games: 21,
    starts: 21,
    minutes: 1864,
    goals: 2,
    assists: 3,
    shots: 10,
    shotsOnGoal: 5,
    chancesCreated: 12,
    interceptions: 51,
    clearances: 92,
    fitScore: 88,
    scoutingTier: 'Strong',
    projection: 'Experienced center back who can anchor a transfer-class rebuild.',
    summary:
      'Composed defender with good body positioning and simple, reliable passing habits.',
    tags: ['Game management', 'Aerial timing', 'Rest-defense anchor'],
    notes: [
      'Less flashy than the top ACC defenders, but the reliability is attractive.',
      'Ideal if your staff wants an organizer rather than a high-risk ball player.',
    ],
    recentMatches: [
      {
        opponent: 'Oklahoma State',
        result: 'W 1-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Delivered a calm 90 and won every key second ball.',
      },
      {
        opponent: 'West Virginia',
        result: 'D 1-1',
        minutes: 90,
        goals: 0,
        assists: 1,
        notes: 'Started the equalizer with a vertical pass after stepping in front of play.',
      },
    ],
  },
  {
    id: 'avery-delaney',
    name: 'Avery Delaney',
    teamId: 'ball-state',
    position: 'MID',
    classYear: 'Sr',
    hometown: 'Cary, NC',
    height: `5'7"`,
    dominantFoot: 'Right',
    games: 20,
    starts: 17,
    minutes: 1515,
    goals: 8,
    assists: 6,
    shots: 42,
    shotsOnGoal: 21,
    chancesCreated: 46,
    interceptions: 24,
    clearances: 12,
    fitScore: 87,
    scoutingTier: 'Strong',
    projection: 'Versatile attacking midfielder who can score without killing possession flow.',
    summary:
      'Box-arriving midfielder with timing, clean combination play, and enough output to change games.',
    tags: ['Late-run scorer', 'Clean combination play', 'Flexible role'],
    notes: [
      'Nice blend of floor and ceiling for a team seeking production from midfield.',
      'Not as controlling as Perez or Lawson, but can tilt matches around the box.',
    ],
    recentMatches: [
      {
        opponent: 'NC State',
        result: 'W 2-1',
        minutes: 80,
        goals: 1,
        assists: 0,
        notes: 'Timed her arrivals well and forced the midfield matchup all night.',
      },
      {
        opponent: 'Duke',
        result: 'L 0-1',
        minutes: 76,
        goals: 0,
        assists: 0,
        notes: 'Still found pockets, but Wake struggled to sustain pressure.',
      },
    ],
  },
  {
    id: 'jade-ramsey',
    name: 'Jade Ramsey',
    teamId: 'central-michigan',
    position: 'GK',
    classYear: 'Grad',
    hometown: 'Knoxville, TN',
    height: `5'10"`,
    dominantFoot: 'Left',
    games: 19,
    starts: 19,
    minutes: 1710,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnGoal: 0,
    chancesCreated: 0,
    interceptions: 0,
    clearances: 0,
    fitScore: 82,
    scoutingTier: 'Watch',
    projection: 'Late-cycle keeper option if you need experience and shot-volume proof.',
    summary:
      'Busy goalkeeper with good reactions and a left foot that opens useful build-up angles.',
    tags: ['Save volume', 'Left-footed build', 'Resilience'],
    notes: [
      'Shot-stopping workload is attractive, but game-control translation needs film.',
      'Could be a useful fallback target if the top keepers move quickly.',
    ],
    recentMatches: [
      {
        opponent: 'Furman',
        result: 'W 1-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Turned away five shots and looked confident claiming late service.',
      },
      {
        opponent: 'Mercer',
        result: 'D 0-0',
        minutes: 90,
        goals: 0,
        assists: 0,
        notes: 'Handled a heavy crossing game and made one strong near-post save.',
      },
    ],
    goalkeeperStats: {
      saves: 101,
      savePct: 0.801,
      cleanSheets: 7,
      longPassAccuracy: 63,
    },
  },
]

export const watchboardIds = [
  'maya-thornton',
  'gianna-perez',
  'lena-kessler',
  'kira-lawson',
] as const
