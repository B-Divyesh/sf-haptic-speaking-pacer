import { sessionSummary, type PaceSample, type SessionRecord } from './pace';

interface DemoSessionSeed {
  id: string;
  startedAt: string;
  durationSeconds: number;
  targetLow: number;
  targetHigh: number;
  samples: PaceSample[];
}

function session(seed: DemoSessionSeed): SessionRecord {
  return {
    ...seed,
    ...sessionSummary(seed.samples, seed.targetLow, seed.targetHigh),
  };
}

export const DEMO_SESSIONS: SessionRecord[] = [
  session({
    id: 'demo-staff-update',
    startedAt: '2026-08-26T08:15:00.000Z',
    durationSeconds: 480,
    targetLow: 120,
    targetHigh: 150,
    samples: [
      { at: 0, wpm: 132, speaking: true, state: 'steady' },
      { at: 60, wpm: 138, speaking: true, state: 'steady' },
      { at: 120, wpm: 144, speaking: true, state: 'steady' },
      { at: 180, wpm: 149, speaking: true, state: 'steady' },
      { at: 240, wpm: 142, speaking: true, state: 'steady' },
      { at: 300, wpm: 154, speaking: true, state: 'fast' },
      { at: 360, wpm: 145, speaking: true, state: 'steady' },
      { at: 420, wpm: 136, speaking: true, state: 'steady' },
    ],
  }),
  session({
    id: 'demo-class-introduction',
    startedAt: '2026-08-24T16:30:00.000Z',
    durationSeconds: 360,
    targetLow: 120,
    targetHigh: 150,
    samples: [
      { at: 0, wpm: 118, speaking: true, state: 'slow' },
      { at: 45, wpm: 127, speaking: true, state: 'steady' },
      { at: 90, wpm: 142, speaking: true, state: 'steady' },
      { at: 135, wpm: 159, speaking: true, state: 'fast' },
      { at: 180, wpm: 166, speaking: true, state: 'fast' },
      { at: 225, wpm: 147, speaking: true, state: 'steady' },
      { at: 270, wpm: 152, speaking: true, state: 'fast' },
      { at: 315, wpm: 133, speaking: true, state: 'steady' },
    ],
  }),
  session({
    id: 'demo-project-briefing',
    startedAt: '2026-08-21T11:00:00.000Z',
    durationSeconds: 540,
    targetLow: 125,
    targetHigh: 155,
    samples: [
      { at: 0, wpm: 128, speaking: true, state: 'steady' },
      { at: 75, wpm: 138, speaking: true, state: 'steady' },
      { at: 150, wpm: 146, speaking: true, state: 'steady' },
      { at: 225, wpm: 152, speaking: true, state: 'steady' },
      { at: 300, wpm: 158, speaking: true, state: 'fast' },
      { at: 375, wpm: 149, speaking: true, state: 'steady' },
      { at: 450, wpm: 141, speaking: true, state: 'steady' },
      { at: 525, wpm: 132, speaking: true, state: 'steady' },
    ],
  }),
  session({
    id: 'demo-panel-answer',
    startedAt: '2026-08-19T09:45:00.000Z',
    durationSeconds: 300,
    targetLow: 120,
    targetHigh: 150,
    samples: [
      { at: 0, wpm: 142, speaking: true, state: 'steady' },
      { at: 40, wpm: 156, speaking: true, state: 'fast' },
      { at: 80, wpm: 164, speaking: true, state: 'fast' },
      { at: 120, wpm: 148, speaking: true, state: 'steady' },
      { at: 160, wpm: 151, speaking: true, state: 'fast' },
      { at: 200, wpm: 139, speaking: true, state: 'steady' },
      { at: 240, wpm: 161, speaking: true, state: 'fast' },
      { at: 280, wpm: 145, speaking: true, state: 'steady' },
    ],
  }),
];

const DEMO_TITLES: Record<string, string> = {
  'demo-staff-update': 'Staff update rehearsal',
  'demo-class-introduction': 'Class introduction rehearsal',
  'demo-project-briefing': 'Project briefing rehearsal',
  'demo-panel-answer': 'Panel answer rehearsal',
};

export function demoSessionTitle(id: string): string | undefined {
  return DEMO_TITLES[id];
}
