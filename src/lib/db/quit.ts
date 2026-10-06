// Data access for the quit tracker, all against the local SQLite file.
// Same function names and shapes the screens expect; nothing here knows
// about React.

import { fromRow, getDb, newId, nowIso, toInsert, toSet, type RawRow } from './client';
import type {
  CopingTool,
  Craving,
  CravingOutcome,
  IfThenPlan,
  QuitAttempt,
  QuitMilestone,
  Slip,
  SupportContact,
  WithdrawalCheckin,
} from '../../types';
import {
  DEFAULT_COPING_TOOLS,
  DEFAULT_IF_THEN_PLANS,
  DEFAULT_MILESTONES,
  DEFAULT_SUPPORT_CONTACTS,
} from '../../constants/quit';
import { cwsTotal } from '../quitLogic';

const ATTEMPT_JSON = ['reasons'] as const;
const CHECKIN_BOOLS = ['vivid_dreams', 'night_sweats', 'headache', 'nausea', 'ate_breakfast', 'worked_out', 'got_outside', 'used_cannabis'] as const;
const CHECKIN_JSON = ['cws_items'] as const;
const CRAVING_BOOLS = ['hungry', 'angry', 'lonely', 'tired'] as const;
const CRAVING_JSON = ['trigger_tags'] as const;
const TOOL_BOOLS = ['is_active'] as const;
const PLAN_BOOLS = ['is_active'] as const;
const MILESTONE_BOOLS = ['reward_claimed'] as const;
const CONTACT_BOOLS = ['text_ok', 'late_night_ok'] as const;
const SLIP_BOOLS = ['support_used'] as const;
const SLIP_JSON = ['trigger_tags'] as const;

// --- Attempt ------------------------------------------------------------------

export async function fetchActiveAttempt(): Promise<QuitAttempt | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawRow>(
    "SELECT * FROM quit_attempts WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
  );
  return row ? fromRow<QuitAttempt>(row, [], ATTEMPT_JSON) : null;
}

export type StartQuitInput = {
  started_at: string;
  baseline_use: string;
  baseline_cost_cents_per_week: number;
  reasons: string[];
};

export async function startQuit(input: StartQuitInput): Promise<QuitAttempt> {
  const db = await getDb();
  const id = newId();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    // Only one active attempt at a time.
    await db.runAsync("UPDATE quit_attempts SET status = 'abandoned', ended_at = ?, updated_at = ? WHERE status = 'active'", ts, ts);
    const ins = toInsert('quit_attempts', {
      id,
      method: 'cold_turkey',
      started_at: input.started_at,
      status: 'active',
      baseline_use: input.baseline_use,
      baseline_cost_cents_per_week: input.baseline_cost_cents_per_week,
      reasons: input.reasons,
      created_at: ts,
      updated_at: ts,
    }, ATTEMPT_JSON);
    await db.runAsync(ins.sql, ins.values);

    for (const m of DEFAULT_MILESTONES) {
      const row = toInsert('quit_milestones', {
        id: newId(), attempt_id: id, day_number: m.day, title: m.title, what_to_expect: m.what_to_expect,
        reward: null, created_at: ts, updated_at: ts,
      });
      await db.runAsync(row.sql, row.values);
    }
    await seedIfEmpty(db, 'coping_tools', DEFAULT_COPING_TOOLS.map((t, i) => ({ ...t, id: newId(), sort_order: i, created_at: ts, updated_at: ts })));
    await seedIfEmpty(db, 'if_then_plans', DEFAULT_IF_THEN_PLANS.map((p, i) => ({ ...p, id: newId(), attempt_id: id, sort_order: i, created_at: ts, updated_at: ts })));
    await seedIfEmpty(db, 'support_contacts', DEFAULT_SUPPORT_CONTACTS.map((c, i) => ({ ...c, id: newId(), sort_order: i, created_at: ts, updated_at: ts })));
  });
  return (await fetchActiveAttempt()) as QuitAttempt;
}

async function seedIfEmpty(db: Awaited<ReturnType<typeof getDb>>, table: string, rows: Record<string, unknown>[]) {
  const c = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  if ((c?.n ?? 0) > 0) return;
  for (const r of rows) {
    const ins = toInsert(table, r);
    await db.runAsync(ins.sql, ins.values);
  }
}

export async function updateAttempt(id: string, patch: Partial<QuitAttempt>): Promise<void> {
  const db = await getDb();
  const { sql, values } = toSet({ ...patch, updated_at: nowIso() }, ATTEMPT_JSON);
  await db.runAsync(`UPDATE quit_attempts SET ${sql} WHERE id = ?`, [...values, id]);
}

// --- Slips --------------------------------------------------------------------

export async function fetchSlips(attemptId: string): Promise<Slip[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM slips WHERE attempt_id = ? ORDER BY occurred_at DESC', attemptId);
  return rows.map((r) => fromRow<Slip>(r, SLIP_BOOLS, SLIP_JSON));
}

export type SlipInput = {
  attempt_id: string;
  occurred_at?: string;
  trigger?: string | null;
  trigger_tags?: string[];
  severity?: number | null;
  support_used?: boolean;
  notes?: string | null;
};

export async function logSlip(input: SlipInput): Promise<void> {
  const db = await getDb();
  const ins = toInsert('slips', {
    id: newId(),
    attempt_id: input.attempt_id,
    occurred_at: input.occurred_at ?? nowIso(),
    trigger: input.trigger ?? null,
    trigger_tags: input.trigger_tags ?? [],
    severity: input.severity ?? null,
    support_used: input.support_used ?? false,
    notes: input.notes ?? null,
    created_at: nowIso(),
  }, SLIP_JSON);
  await db.runAsync(ins.sql, ins.values);
}

// --- Check-ins ----------------------------------------------------------------

export async function fetchCheckins(attemptId: string): Promise<WithdrawalCheckin[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM withdrawal_checkins WHERE attempt_id = ? ORDER BY checkin_date DESC', attemptId);
  return rows.map((r) => fromRow<WithdrawalCheckin>(r, CHECKIN_BOOLS, CHECKIN_JSON));
}

export type CheckinInput = Partial<Omit<WithdrawalCheckin, 'id' | 'created_at' | 'updated_at'>> & {
  attempt_id: string;
  checkin_date: string;
};

export async function upsertCheckin(input: CheckinInput): Promise<WithdrawalCheckin> {
  const db = await getDb();
  const ts = nowIso();
  const payload = { ...input, cws_total: input.cws_items ? cwsTotal(input.cws_items) : input.cws_total ?? null };
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM withdrawal_checkins WHERE attempt_id = ? AND checkin_date = ?', input.attempt_id, input.checkin_date
  );
  if (existing) {
    const { attempt_id: _a, checkin_date: _d, ...rest } = payload;
    const { sql, values } = toSet({ ...rest, updated_at: ts }, CHECKIN_JSON);
    await db.runAsync(`UPDATE withdrawal_checkins SET ${sql} WHERE id = ?`, [...values, existing.id]);
  } else {
    const ins = toInsert('withdrawal_checkins', { id: newId(), ...payload, created_at: ts, updated_at: ts }, CHECKIN_JSON);
    await db.runAsync(ins.sql, ins.values);
  }
  const row = await db.getFirstAsync<RawRow>(
    'SELECT * FROM withdrawal_checkins WHERE attempt_id = ? AND checkin_date = ?', input.attempt_id, input.checkin_date
  );
  return fromRow<WithdrawalCheckin>(row as RawRow, CHECKIN_BOOLS, CHECKIN_JSON);
}

// --- Cravings -----------------------------------------------------------------

export async function fetchCravings(attemptId: string, limit = 500): Promise<Craving[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM cravings WHERE attempt_id = ? ORDER BY occurred_at DESC LIMIT ?', attemptId, limit);
  return rows.map((r) => fromRow<Craving>(r, CRAVING_BOOLS, CRAVING_JSON));
}

export type CravingInput = {
  attempt_id: string;
  intensity: number;
  occurred_at?: string;
  hungry?: boolean;
  angry?: boolean;
  lonely?: boolean;
  tired?: boolean;
  trigger_tags?: string[];
  context?: string | null;
  coping_action?: string | null;
  coping_tool_id?: string | null;
  notes?: string | null;
};

export async function createCraving(input: CravingInput): Promise<Craving> {
  const db = await getDb();
  const id = newId();
  const ts = nowIso();
  const ins = toInsert('cravings', {
    id,
    attempt_id: input.attempt_id,
    occurred_at: input.occurred_at ?? ts,
    intensity: input.intensity,
    hungry: input.hungry ?? false,
    angry: input.angry ?? false,
    lonely: input.lonely ?? false,
    tired: input.tired ?? false,
    trigger_tags: input.trigger_tags ?? [],
    context: input.context ?? null,
    coping_action: input.coping_action ?? null,
    coping_tool_id: input.coping_tool_id ?? null,
    notes: input.notes ?? null,
    created_at: ts,
    updated_at: ts,
  }, CRAVING_JSON);
  await db.runAsync(ins.sql, ins.values);
  const row = await db.getFirstAsync<RawRow>('SELECT * FROM cravings WHERE id = ?', id);
  return fromRow<Craving>(row as RawRow, CRAVING_BOOLS, CRAVING_JSON);
}

export type CravingResolution = {
  outcome: CravingOutcome;
  intensity_after?: number | null;
  duration_minutes?: number | null;
  coping_action?: string | null;
  coping_tool_id?: string | null;
  notes?: string | null;
};

export async function resolveCraving(id: string, patch: CravingResolution): Promise<Craving> {
  const db = await getDb();
  const { sql, values } = toSet({ ...patch, updated_at: nowIso() });
  await db.runAsync(`UPDATE cravings SET ${sql} WHERE id = ?`, [...values, id]);
  const row = await db.getFirstAsync<RawRow>('SELECT * FROM cravings WHERE id = ?', id);
  return fromRow<Craving>(row as RawRow, CRAVING_BOOLS, CRAVING_JSON);
}

// --- Toolkit ------------------------------------------------------------------

export async function fetchCopingTools(): Promise<CopingTool[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM coping_tools WHERE is_active = 1 ORDER BY sort_order');
  return rows.map((r) => fromRow<CopingTool>(r, TOOL_BOOLS));
}

export async function markToolUsed(tool: CopingTool, helpful: boolean | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE coping_tools SET times_used = times_used + 1, helpful_votes = helpful_votes + ?, last_used_at = ?, updated_at = ? WHERE id = ?',
    helpful ? 1 : 0, nowIso(), nowIso(), tool.id
  );
}

export async function createCopingTool(input: Pick<CopingTool, 'name' | 'kind' | 'instructions' | 'minutes' | 'setting'>): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM coping_tools');
  const ins = toInsert('coping_tools', { id: newId(), ...input, sort_order: (max?.m ?? 0) + 1, is_active: true, created_at: ts, updated_at: ts });
  await db.runAsync(ins.sql, ins.values);
}

export async function fetchIfThenPlans(): Promise<IfThenPlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM if_then_plans WHERE is_active = 1 ORDER BY sort_order');
  return rows.map((r) => fromRow<IfThenPlan>(r, PLAN_BOOLS));
}

export async function createIfThenPlan(input: Pick<IfThenPlan, 'situation' | 'response' | 'category'> & { attempt_id?: string | null }): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM if_then_plans');
  const ins = toInsert('if_then_plans', {
    id: newId(), attempt_id: input.attempt_id ?? null, situation: input.situation, response: input.response,
    category: input.category, sort_order: (max?.m ?? 0) + 1, is_active: true, created_at: ts, updated_at: ts,
  });
  await db.runAsync(ins.sql, ins.values);
}

export async function updateIfThenPlan(id: string, patch: Partial<IfThenPlan>): Promise<void> {
  const db = await getDb();
  const { sql, values } = toSet({ ...patch, updated_at: nowIso() });
  await db.runAsync(`UPDATE if_then_plans SET ${sql} WHERE id = ?`, [...values, id]);
}

export async function bumpIfThenPlan(plan: IfThenPlan, held: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE if_then_plans SET times_triggered = times_triggered + 1, times_held = times_held + ?, updated_at = ? WHERE id = ?',
    held ? 1 : 0, nowIso(), plan.id
  );
}

// --- Milestones ---------------------------------------------------------------

export async function fetchMilestones(attemptId: string): Promise<QuitMilestone[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM quit_milestones WHERE attempt_id = ? ORDER BY day_number', attemptId);
  return rows.map((r) => fromRow<QuitMilestone>(r, MILESTONE_BOOLS));
}

export async function updateMilestone(id: string, patch: Partial<QuitMilestone>): Promise<void> {
  const db = await getDb();
  const { sql, values } = toSet({ ...patch, updated_at: nowIso() });
  await db.runAsync(`UPDATE quit_milestones SET ${sql} WHERE id = ?`, [...values, id]);
}

// --- Support contacts ---------------------------------------------------------

export async function fetchSupportContacts(): Promise<SupportContact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>('SELECT * FROM support_contacts ORDER BY sort_order');
  return rows.map((r) => fromRow<SupportContact>(r, CONTACT_BOOLS));
}

export async function updateSupportContact(id: string, patch: Partial<SupportContact>): Promise<void> {
  const db = await getDb();
  const { sql, values } = toSet({ ...patch, updated_at: nowIso() });
  await db.runAsync(`UPDATE support_contacts SET ${sql} WHERE id = ?`, [...values, id]);
}

export async function createSupportContact(input: Pick<SupportContact, 'name' | 'role'> & Partial<SupportContact>): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM support_contacts');
  const ins = toInsert('support_contacts', {
    id: newId(), name: input.name, role: input.role, phone: input.phone ?? null, text_ok: input.text_ok ?? true,
    late_night_ok: input.late_night_ok ?? false, knows: input.knows ?? 'none', notes: input.notes ?? null,
    sort_order: (max?.m ?? 0) + 1, created_at: ts, updated_at: ts,
  });
  await db.runAsync(ins.sql, ins.values);
}

// --- Settings -----------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

// Wipes everything. Settings screen only, behind a confirm.
export async function resetAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM slips; DELETE FROM cravings; DELETE FROM withdrawal_checkins; DELETE FROM quit_milestones;
    DELETE FROM if_then_plans; DELETE FROM coping_tools; DELETE FROM support_contacts; DELETE FROM quit_attempts; DELETE FROM settings;
  `);
}
