import React from 'react';
import { Pressable, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ThemeProvider, useTheme } from '../lib/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';
import { Screen } from '../components/ui/Screen';

// Inner component so useTheme() runs inside the ThemeProvider.
function RootStack() {
  const { colors, spacing, typography } = useTheme();
  const { session, isLoading } = useAuth();

  if (!isConfigured) {
    return (
      <Screen safeTop>
        <Text style={[typography.display, { color: colors.text, marginBottom: spacing.md }]}>Not connected</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart
          `npx expo start`.
        </Text>
      </Screen>
    );
  }

  if (isLoading) return <Screen />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen
          name="index"
          options={{
            title: 'Off weed',
            headerRight: () => (
              <Pressable
                onPress={() => router.push('/settings')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={22} color={colors.text} />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="setup" options={{ title: 'Start', presentation: 'modal' }} />
        <Stack.Screen name="craving" options={{ title: 'Craving', presentation: 'modal' }} />
        <Stack.Screen name="checkin" options={{ title: 'Check in', presentation: 'modal' }} />
        <Stack.Screen name="slip" options={{ title: 'Log a slip', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RootStack />
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
