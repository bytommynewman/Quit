import { describe, expect, it } from 'vitest';
import { currentRun } from '../streak';

describe('currentRun', () => {
  const start = new Date(2026, 9, 6, 15, 0).toISOString();
  it('counts calendar days since the quit when there are no slips', () => {
    expect(currentRun({ started_at: start }, [], new Date(2026, 9, 9, 8, 0))).toBe(3);
  });
  it('restarts from the most recent slip', () => {
    const slips = [{ occurred_at: new Date(2026, 9, 8, 23, 30).toISOString() }, { occurred_at: new Date(2026, 9, 7, 1, 0).toISOString() }];
    expect(currentRun({ started_at: start }, slips, new Date(2026, 9, 9, 8, 0))).toBe(1);
  });
  it('never goes negative', () => {
    expect(currentRun({ started_at: start }, [], new Date(2026, 9, 1))).toBe(0);
  });
});
