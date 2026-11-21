/** The six rounds of the CloudDesk negotiation, in order (§10.3). Used by the Rounds tab and AskSirion. */
export const ROUNDS = [
  { no: 1, at: '2026-11-01T11:20:00+05:30', kind: 'version', ref: 'v1', messageId: 'M1', who: 'rohan' },
  { no: 2, at: '2026-11-06T12:40:00+05:30', kind: 'version', ref: 'v3', messageId: 'M3', who: 'rohan' },
  { no: 3, at: '2026-11-10T09:15:00+05:30', kind: 'email', ref: 'M5', messageId: 'M5', who: 'rohan' },
  { no: 4, at: '2026-11-14T10:05:00+05:30', kind: 'version', ref: 'v4', messageId: 'M8', who: 'rohan' },
  { no: 5, at: '2026-11-16T17:45:00+05:30', kind: 'email', ref: 'M12', messageId: 'M12', who: 'rohan' },
  { no: 6, at: '2026-11-19T09:30:00+05:30', kind: 'version', ref: 'v6', messageId: 'M14', who: 'priya' },
] as const;

export type Round = (typeof ROUNDS)[number];

/** Rounds that have happened by this point on the demo clock. */
export function roundsBy(clock: string): Round[] {
  return ROUNDS.filter((r) => r.at <= clock);
}
