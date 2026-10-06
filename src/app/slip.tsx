import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/quit/Chip';
import { useTheme } from '../lib/theme';
import { useActiveAttempt, useLogSlip } from '../lib/hooks/useQuit';
import { CRAVING_TRIGGERS } from '../constants/quit';

export default function SlipScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: attempt } = useActiveAttempt();
  const logSlip = useLogSlip();

  const [trigger, setTrigger] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number | null>(null);
  const [supportUsed, setSupportUsed] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function handleSave() {
    if (!attempt) return;
    setError(null);
    try {
      await logSlip.mutateAsync({
        attempt_id: attempt.id,
        trigger: trigger.trim() || null,
        trigger_tags: tags,
        severity,
        support_used: supportUsed,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!attempt) {
    return (
      <Screen>
        <Text style={[typography.body, { color: colors.textMuted }]}>Start the quit first.</Text>
        <View style={{ height: spacing.md }} />
        <Button label="Start the quit" onPress={() => router.replace('/setup')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={[typography.caption, { color: colors.calm, marginBottom: spacing.lg }]}>
        Logging this is the strong move, not the weak one. The details you write down now are exactly
        what makes the next one easier to see coming.
      </Text>

      <View style={{ gap: spacing.md }}>
        <View>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
            What was going on right before? (tap any that fit)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CRAVING_TRIGGERS.map((tag) => (
              <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
            ))}
          </View>
        </View>

        <TextField
          label="In your own words (optional)"
          value={trigger}
          onChangeText={setTrigger}
          placeholder="What led up to it?"
        />

        <View>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
            How bad did it feel? (1 = blip, 5 = rough)
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setSeverity(n)}
                accessibilityRole="button"
                accessibilityLabel={`Severity ${n}`}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.md,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: severity === n ? colors.primary : colors.border,
                  backgroundColor: severity === n ? colors.primaryMuted : colors.surface,
                }}
              >
                <Text style={{ color: colors.text }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => setSupportUsed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: supportUsed }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: supportUsed ? colors.primary : colors.border,
              backgroundColor: supportUsed ? colors.primary : colors.surface,
            }}
          />
          <Text style={[typography.caption, { color: colors.text }]}>
            I reached out to someone or used a coping strategy
          </Text>
        </Pressable>

        <TextField
          label="Anything else worth remembering? (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={{ minHeight: 88, textAlignVertical: 'top' }}
        />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button label="Save" onPress={handleSave} loading={logSlip.isPending} />
      </View>
    </Screen>
  );
}
