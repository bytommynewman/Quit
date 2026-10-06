import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as q from '../api/quit';
import type { CopingTool, IfThenPlan, QuitAttempt, QuitMilestone, SupportContact } from '../../types';

export const KEYS = {
  attempt: ['quit_attempt'] as const,
  slips: (id: string) => ['slips', id] as const,
  checkins: (id: string) => ['withdrawal_checkins', id] as const,
  cravings: (id: string) => ['cravings', id] as const,
  tools: ['coping_tools'] as const,
  plans: ['if_then_plans'] as const,
  milestones: (id: string) => ['quit_milestones', id] as const,
  contacts: ['support_contacts'] as const,
  setting: (key: string) => ['setting', key] as const,
};

export function useActiveAttempt() {
  return useQuery({ queryKey: KEYS.attempt, queryFn: q.fetchActiveAttempt });
}

export function useStartQuit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: q.startQuit,
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<QuitAttempt> }) => q.updateAttempt(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.attempt }),
  });
}

export function useSlips(attemptId: string | undefined) {
  return useQuery({ queryKey: KEYS.slips(attemptId ?? ''), queryFn: () => q.fetchSlips(attemptId as string), enabled: !!attemptId });
}

export function useLogSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: q.logSlip,
    onSuccess: (_r, input) => qc.invalidateQueries({ queryKey: KEYS.slips(input.attempt_id) }),
  });
}

export function useCheckins(attemptId: string | undefined) {
  return useQuery({ queryKey: KEYS.checkins(attemptId ?? ''), queryFn: () => q.fetchCheckins(attemptId as string), enabled: !!attemptId });
}

export function useUpsertCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: q.upsertCheckin,
    onSuccess: (row) => qc.invalidateQueries({ queryKey: KEYS.checkins(row.attempt_id) }),
  });
}

export function useCravings(attemptId: string | undefined) {
  return useQuery({ queryKey: KEYS.cravings(attemptId ?? ''), queryFn: () => q.fetchCravings(attemptId as string), enabled: !!attemptId });
}

export function useCreateCraving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: q.createCraving,
    onSuccess: (row) => qc.invalidateQueries({ queryKey: KEYS.cravings(row.attempt_id) }),
  });
}

export function useResolveCraving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: q.CravingResolution }) => q.resolveCraving(id, patch),
    onSuccess: (row) => qc.invalidateQueries({ queryKey: KEYS.cravings(row.attempt_id) }),
  });
}

export function useCopingTools() {
  return useQuery({ queryKey: KEYS.tools, queryFn: q.fetchCopingTools });
}

export function useMarkToolUsed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tool, helpful }: { tool: CopingTool; helpful: boolean | null }) => q.markToolUsed(tool, helpful),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tools }),
  });
}

export function useCreateCopingTool() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: q.createCopingTool, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tools }) });
}

export function useIfThenPlans() {
  return useQuery({ queryKey: KEYS.plans, queryFn: q.fetchIfThenPlans });
}

export function useCreateIfThenPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: q.createIfThenPlan, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.plans }) });
}

export function useUpdateIfThenPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<IfThenPlan> }) => q.updateIfThenPlan(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.plans }),
  });
}

export function useBumpIfThenPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plan, held }: { plan: IfThenPlan; held: boolean }) => q.bumpIfThenPlan(plan, held),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.plans }),
  });
}

export function useMilestones(attemptId: string | undefined) {
  return useQuery({ queryKey: KEYS.milestones(attemptId ?? ''), queryFn: () => q.fetchMilestones(attemptId as string), enabled: !!attemptId });
}

export function useUpdateMilestone(attemptId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<QuitMilestone> }) => q.updateMilestone(id, patch),
    onSuccess: () => {
      if (attemptId) qc.invalidateQueries({ queryKey: KEYS.milestones(attemptId) });
    },
  });
}

export function useSupportContacts() {
  return useQuery({ queryKey: KEYS.contacts, queryFn: q.fetchSupportContacts });
}

export function useUpdateSupportContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SupportContact> }) => q.updateSupportContact(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contacts }),
  });
}

export function useCreateSupportContact() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: q.createSupportContact, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contacts }) });
}

export function useSetting(key: string) {
  return useQuery({ queryKey: KEYS.setting(key), queryFn: () => q.getSetting(key) });
}

export function useSetSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string | null }) => q.setSetting(key, value),
    onSuccess: (_r, { key }) => qc.invalidateQueries({ queryKey: KEYS.setting(key) }),
  });
}

export function useResetAllData() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: q.resetAllData, onSuccess: () => qc.invalidateQueries() });
}
