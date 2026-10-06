import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const empty = email.trim().length === 0 || password.length === 0;

  async function signIn() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(err.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
      if (err) setError(err.message);
      else if (!data.session) {
        setNotice(
          "Account created. In Supabase → Authentication → Sign In / Providers → Email, turn off 'Confirm email', then sign in."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen safeTop scroll>
      <View style={{ gap: spacing.md, paddingTop: spacing.xl }}>
        <Text style={[typography.display, { color: colors.text }]}>Quit</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Email is just your username here. Nothing is ever sent to it.
        </Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
        {notice ? <Text style={[typography.caption, { color: colors.textMuted }]}>{notice}</Text> : null}
        <Button label="Sign in" onPress={signIn} loading={loading} disabled={loading || empty} />
        <Button label="Create account" variant="ghost" onPress={signUp} loading={loading} disabled={loading || empty} />
      </View>
    </Screen>
  );
}
