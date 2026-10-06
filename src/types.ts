// Row types for the local SQLite database (see lib/db/schema.ts). Booleans
// are stored as 0/1 and arrays/objects as JSON text; lib/db/* maps both ways
// so everything above the db layer sees these shapes.

export type QuitMethod = 'cold_turkey' | 'taper';
export type QuitStatus = 'active' | 'completed' | 'abandoned';
export type CravingOutcome = 'passed' | 'used' | 'partial';
export type CopingToolKind = 'move' | 'body' | 'mind' | 'social' | 'swap' | 'build';
export type CopingToolSetting = 'anywhere' | 'home' | 'out';
export type IfThenCategory =
  | 'general' | 'night_out' | 'home' | 'sleep' | 'food' | 'social' | 'mood' | 'nicotine' | 'alcohol' | 'ex';
export type SupportRole = 'parent' | 'family' | 'therapist' | 'doctor' | 'friend' | 'crisis_line' | 'other';
export type SupportKnows = 'full' | 'partial' | 'none';

export type QuitAttempt = {
  id: string;
  method: QuitMethod;
  started_at: string;
  ended_at: string | null;
  status: QuitStatus;
  baseline_use: string | null;
  baseline_cost_cents_per_week: number;
  reasons: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Slip = {
  id: string;
  attempt_id: string;
  occurred_at: string;
  trigger: string | null;
  trigger_tags: string[];
  severity: number | null;
  support_used: boolean;
  notes: string | null;
  created_at: string;
};

export type WithdrawalCheckin = {
  id: string;
  attempt_id: string;
  checkin_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  appetite: number | null;
  mood: number | null;
  anxiety: number | null;
  irritability: number | null;
  energy: number | null;
  craving_peak: number | null;
  vivid_dreams: boolean;
  night_sweats: boolean;
  headache: boolean;
  nausea: boolean;
  meals_count: number | null;
  ate_breakfast: boolean;
  worked_out: boolean;
  got_outside: boolean;
  used_cannabis: boolean;
  nicotine_level: number | null;
  drinks_count: number | null;
  cws_items: Record<string, number> | null;
  cws_total: number | null;
  cws_interference: number | null;
  win: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Craving = {
  id: string;
  attempt_id: string;
  occurred_at: string;
  intensity: number;
  hungry: boolean;
  angry: boolean;
  lonely: boolean;
  tired: boolean;
  trigger_tags: string[];
  context: string | null;
  coping_action: string | null;
  coping_tool_id: string | null;
  duration_minutes: number | null;
  outcome: CravingOutcome | null;
  intensity_after: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CopingTool = {
  id: string;
  name: string;
  kind: CopingToolKind;
  instructions: string;
  minutes: number;
  setting: CopingToolSetting;
  sort_order: number;
  is_active: boolean;
  times_used: number;
  helpful_votes: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IfThenPlan = {
  id: string;
  attempt_id: string | null;
  situation: string;
  response: string;
  category: IfThenCategory;
  sort_order: number;
  is_active: boolean;
  times_triggered: number;
  times_held: number;
  created_at: string;
  updated_at: string;
};

export type QuitMilestone = {
  id: string;
  attempt_id: string;
  day_number: number;
  title: string;
  what_to_expect: string | null;
  reward: string | null;
  reached_at: string | null;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
};

export type SupportContact = {
  id: string;
  name: string;
  role: SupportRole;
  phone: string | null;
  text_ok: boolean;
  late_night_ok: boolean;
  knows: SupportKnows;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
