// Data access for the quit tracker, against Supabase (Postgres + RLS).
// Same function names and shapes the screens expect; nothing here knows
// about React. user_id is never sent: it defaults to auth.uid() server-side
// and row-level security scopes every read and write to the signed-in user.

import { supabase } from '../supabase';
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

// --- Attempt ------------------------------------------------------------------

export async function fetchActiveAttempt(): Promise<QuitAttempt | null> {
  const { data, error } = await supabase
    .from('quit_attempts')
    .select('*')
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as QuitAttempt | null) ?? null;
}

export type StartQuitInput = {
  started_at: string;
  baseline_use: string;
  baseline_cost_cents_per_week: number;
  reasons: string[];
};

export async function startQuit(input: StartQuitInput): Promise<QuitAttempt> {
  // Only one active attempt at a time (unique partial index enforces it).
  const { error: abandonError } = await supabase
    .from('quit_attempts')
    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
    .eq('status', 'active');
  if (abandonError) throw abandonError;

  const { data, error } = await supabase
    .from('quit_attempts')
    .insert({
      method: 'cold_turkey',
      started_at: input.started_at,
      status: 'active',
      baseline_use: input.baseline_use,
      baseline_cost_cents_per_week: input.baseline_cost_cents_per_week,
      reasons: input.reasons,
    })
    .select()
    .single();
  if (error) throw error;
  const created = data as QuitAttempt;

  const { error: milestoneError } = await supabase.from('quit_milestones').insert(
    DEFAULT_MILESTONES.map((m) => ({
      attempt_id: created.id,
      day_number: m.day,
      title: m.title,
      what_to_expect: m.what_to_expect,
      reward: null,
    }))
  );
  if (milestoneError) throw milestoneError;

  await seedIfEmpty('coping_tools', DEFAULT_COPING_TOOLS.map((t, i) => ({ ...t, sort_order: i })));
  await seedIfEmpty(
    'if_then_plans',
    DEFAULT_IF_THEN_PLANS.map((p, i) => ({ ...p, attempt_id: created.id, sort_order: i }))
  );
  await seedIfEmpty('support_contacts', DEFAULT_SUPPORT_CONTACTS.map((c, i) => ({ ...c, sort_order: i })));

  return created;
}

async function seedIfEmpty(table: 'coping_tools' | 'if_then_plans' | 'support_contacts', rows: object[]) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw insertError;
}

// Next sort_order for appending to a user-ordered list.
async function nextSortOrder(table: 'coping_tools' | 'if_then_plans' | 'support_contacts'): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data as { sort_order: number } | null)?.sort_order ?? 0) + 1;
}

export async function updateAttempt(id: string, patch: Partial<QuitAttempt>): Promise<void> {
  const { error } = await supabase.from('quit_attempts').update(patch).eq('id', id);
  if (error) throw error;
}

// --- Slips --------------------------------------------------------------------

export async function fetchSlips(attemptId: string): Promise<Slip[]> {
  const { data, error } = await supabase
    .from('slips')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return data as Slip[];
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
  const { error } = await supabase.from('slips').insert({
    attempt_id: input.attempt_id,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    trigger: input.trigger ?? null,
    trigger_tags: input.trigger_tags ?? [],
    severity: input.severity ?? null,
    support_used: input.support_used ?? false,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}

// --- Check-ins ----------------------------------------------------------------

export async function fetchCheckins(attemptId: string): Promise<WithdrawalCheckin[]> {
  const { data, error } = await supabase
    .from('withdrawal_checkins')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('checkin_date', { ascending: false });
  if (error) throw error;
  return data as WithdrawalCheckin[];
}

export type CheckinInput = Partial<Omit<WithdrawalCheckin, 'id' | 'created_at' | 'updated_at'>> & {
  attempt_id: string;
  checkin_date: string;
};

export async function upsertCheckin(input: CheckinInput): Promise<WithdrawalCheckin> {
  const payload = { ...input, cws_total: input.cws_items ? cwsTotal(input.cws_items) : input.cws_total ?? null };
  const { data, error } = await supabase
    .from('withdrawal_checkins')
    .upsert(payload, { onConflict: 'attempt_id,checkin_date' })
    .select()
    .single();
  if (error) throw error;
  return data as WithdrawalCheckin;
}

// --- Cravings -----------------------------------------------------------------

export async function fetchCravings(attemptId: string, limit = 500): Promise<Craving[]> {
  const { data, error } = await supabase
    .from('cravings')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Craving[];
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
  const { data, error } = await supabase
    .from('cravings')
    .insert({
      attempt_id: input.attempt_id,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
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
    })
    .select()
    .single();
  if (error) throw error;
  return data as Craving;
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
  const { data, error } = await supabase.from('cravings').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Craving;
}

// --- Toolkit ------------------------------------------------------------------

export async function fetchCopingTools(): Promise<CopingTool[]> {
  const { data, error } = await supabase.from('coping_tools').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data as CopingTool[];
}

export async function markToolUsed(tool: CopingTool, helpful: boolean | null): Promise<void> {
  const { error } = await supabase
    .from('coping_tools')
    .update({
      times_used: tool.times_used + 1,
      helpful_votes: tool.helpful_votes + (helpful ? 1 : 0),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tool.id);
  if (error) throw error;
}

export async function createCopingTool(
  input: Pick<CopingTool, 'name' | 'kind' | 'instructions' | 'minutes' | 'setting'>
): Promise<void> {
  const sort_order = await nextSortOrder('coping_tools');
  const { error } = await supabase.from('coping_tools').insert({ ...input, sort_order, is_active: true });
  if (error) throw error;
}

export async function fetchIfThenPlans(): Promise<IfThenPlan[]> {
  const { data, error } = await supabase.from('if_then_plans').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data as IfThenPlan[];
}

export async function createIfThenPlan(
  input: Pick<IfThenPlan, 'situation' | 'response' | 'category'> & { attempt_id?: string | null }
): Promise<void> {
  const sort_order = await nextSortOrder('if_then_plans');
  const { error } = await supabase.from('if_then_plans').insert({
    attempt_id: input.attempt_id ?? null,
    situation: input.situation,
    response: input.response,
    category: input.category,
    sort_order,
    is_active: true,
  });
  if (error) throw error;
}

export async function updateIfThenPlan(id: string, patch: Partial<IfThenPlan>): Promise<void> {
  const { error } = await supabase.from('if_then_plans').update(patch).eq('id', id);
  if (error) throw error;
}

export async function bumpIfThenPlan(plan: IfThenPlan, held: boolean): Promise<void> {
  const { error } = await supabase
    .from('if_then_plans')
    .update({ times_triggered: plan.times_triggered + 1, times_held: plan.times_held + (held ? 1 : 0) })
    .eq('id', plan.id);
  if (error) throw error;
}

// --- Milestones ---------------------------------------------------------------

export async function fetchMilestones(attemptId: string): Promise<QuitMilestone[]> {
  const { data, error } = await supabase
    .from('quit_milestones')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('day_number');
  if (error) throw error;
  return data as QuitMilestone[];
}

export async function updateMilestone(id: string, patch: Partial<QuitMilestone>): Promise<void> {
  const { error } = await supabase.from('quit_milestones').update(patch).eq('id', id);
  if (error) throw error;
}

// --- Support contacts ---------------------------------------------------------

export async function fetchSupportContacts(): Promise<SupportContact[]> {
  const { data, error } = await supabase.from('support_contacts').select('*').order('sort_order');
  if (error) throw error;
  return data as SupportContact[];
}

export async function updateSupportContact(id: string, patch: Partial<SupportContact>): Promise<void> {
  const { error } = await supabase.from('support_contacts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function createSupportContact(
  input: Pick<SupportContact, 'name' | 'role'> & Partial<SupportContact>
): Promise<void> {
  const sort_order = await nextSortOrder('support_contacts');
  const { error } = await supabase.from('support_contacts').insert({
    name: input.name,
    role: input.role,
    phone: input.phone ?? null,
    text_ok: input.text_ok ?? true,
    late_night_ok: input.late_night_ok ?? false,
    knows: input.knows ?? 'none',
    notes: input.notes ?? null,
    sort_order,
  });
  if (error) throw error;
}

// --- Settings -----------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return (data as { value: string | null } | null)?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  // user_id is a server default; ON CONFLICT (user_id, key) still resolves
  // because defaults are applied before the conflict check.
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'user_id,key' });
  if (error) throw error;
}

// Wipes the signed-in user's data. Settings screen only, behind a confirm.
export async function resetAllData(): Promise<void> {
  const tables = [
    'slips',
    'cravings',
    'withdrawal_checkins',
    'quit_milestones',
    'if_then_plans',
    'coping_tools',
    'support_contacts',
    'quit_attempts',
  ] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }
  const { error } = await supabase.from('settings').delete().not('key', 'is', null);
  if (error) throw error;
}
