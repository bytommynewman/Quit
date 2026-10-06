import { differenceInCalendarDays, max, parseISO } from 'date-fns';
import type { QuitAttempt, Slip } from '../types';

// Calendar days since the later of the quit start and the most recent slip.
// A slip resets the current run (the best run is kept separately, see
// longestCleanRun in quitLogic.ts).
export function currentRun(
  attempt: Pick<QuitAttempt, 'started_at'>,
  slips: Pick<Slip, 'occurred_at'>[],
  now: Date = new Date()
): number {
  const anchors = [parseISO(attempt.started_at), ...slips.map((s) => parseISO(s.occurred_at))];
  return Math.max(0, differenceInCalendarDays(now, max(anchors)));
}
