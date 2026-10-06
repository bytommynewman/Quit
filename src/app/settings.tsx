import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { SectionLabel } from '../components/quit/SectionLabel';
import { useTheme } from '../lib/theme';
import {
  useActiveAttempt,
  useResetAllData,
  useSetSetting,
  useSetting,
  useUpdateAttempt,
} from '../lib/hooks/useQuit';
import { applyReminders, parsePrefs, type ReminderPrefs } from '../lib/reminders';

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { data: attempt } = useActiveAttempt();
  const { data: rawPrefs } = useSetting('reminders');
  const setSetting = useSetSetting();
  const updateAttempt = useUpdateAttempt();
  const resetAll = useResetAllData();

  const prefs = parsePrefs(rawPrefs ?? null);
  const [notifOff, setNotifOff] = useState(false);
  const [cost, setCost] = useState('');
  const [costSaved, setCostSaved] = useState(false);

  useEffect(() => {
    if (attempt) setCost(String(attempt.baseline_cost_cents_per_week / 100));
  }, [attempt?.id, attempt?.baseline_cost_cents_per_week]);

  async function changePrefs(patch: Partial<ReminderPrefs>) {
    const next = { ...prefs, ...patch };
    await setSetting.mutateAsync({ key: 'reminders', value: JSON.stringify(next) });
    try {
      const ok = await applyReminders(next);
      setNotifOff(!ok);
    } catch {
      setNotifOff(true);
    }
  }

  async function saveCost() {
    if (!attempt) return;
    const cents = Math.max(0, Math.round(Number(cost.replace(/[^0-9.]/g, '')) * 100) || 0);
    await updateAttempt.mutateAsync({ id: attempt.id, patch: { baseline_cost_cents_per_week: cents } });
    setCostSaved(true);
  }

  function confirmReset() {
    Alert.alert(
      'Reset everything?',
      'This deletes the quit, every check-in, craving and slip, your plans, toolkit and contacts. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset everything',
          style: 'destructive',
          onPress: async () => {
            await resetAll.mutateAsync();
            try {
              await applyReminders({ ...prefs, evening: false, morning: false });
            } catch {
              // nothing scheduled to clear
            }
            router.replace('/');
          },
        },
      ]
    );
  }

  return (
    <Screen scroll>
      <SectionLabel>Reminders</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ToggleRow
          label="Evening check-in"
          sub="9 pm. The risk window, and the quickest time to check in."
          value={prefs.evening}
          onChange={(v) => changePrefs({ evening: v })}
        />
        <ToggleRow
          label="Morning line"
          sub="9:30 am. Starts the day with the count instead of the craving."
          value={prefs.morning}
          onChange={(v) => changePrefs({ morning: v })}
        />
        {notifOff ? (
          <Text style={[typography.caption, { color: colors.danger, paddingBottom: spacing.sm }]}>
            Notifications are off in system settings, so these will not fire.
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.textFaint, paddingBottom: spacing.sm }]}>
          In Expo Go on iOS, local notifications may not show. Use a development build.
        </Text>
      </Card>

      <SectionLabel>Quit</SectionLabel>
      {attempt ? (
        <Card style={{ gap: spacing.sm }}>
          <View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Started</Text>
            <Text style={[typography.body, { color: colors.text }]}>
              {format(parseISO(attempt.started_at), 'EEE d MMM yyyy, h:mm a')}
            </Text>
          </View>
          {attempt.baseline_use ? (
            <View>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Before</Text>
              <Text style={[typography.body, { color: colors.text }]}>{attempt.baseline_use}</Text>
            </View>
          ) : null}
          <TextField
            label="What it cost per week ($)"
            value={cost}
            onChangeText={(t) => {
              setCost(t);
              setCostSaved(false);
            }}
            keyboardType="decimal-pad"
            onEndEditing={saveCost}
          />
          <Button
            label={costSaved ? 'Saved' : 'Save cost'}
            variant="secondary"
            onPress={saveCost}
            loading={updateAttempt.isPending}
          />
          {attempt.reasons.length > 0 ? (
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>Why</Text>
              {attempt.reasons.map((r) => (
                <Text key={r} style={[typography.body, { color: colors.text, marginBottom: 4 }]}>
                  · {r}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>No quit running.</Text>
          <Button label="Start the quit" onPress={() => router.push('/setup')} />
        </Card>
      )}

      <SectionLabel>Danger zone</SectionLabel>
      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Wipes everything on this phone and starts from nothing.
        </Text>
        <Pressable
          onPress={confirmReset}
          accessibilityRole="button"
          accessibilityLabel="Reset everything"
          style={({ pressed }) => ({
            paddingVertical: spacing.md,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.danger,
            alignItems: 'center',
            opacity: pressed || resetAll.isPending ? 0.7 : 1,
          })}
        >
          <Text style={[typography.body, { color: colors.danger, fontWeight: '600' }]}>Reset everything</Text>
        </Pressable>
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Everything stays on this phone. Nothing is sent anywhere. This is a tracker, not medical advice. If you are
          thinking about hurting yourself, or panic will not settle, call: 988, Reach Out 519-433-2023, or
          ConnexOntario 1-866-531-2600.
        </Text>
      </Card>
    </Screen>
  );
}
