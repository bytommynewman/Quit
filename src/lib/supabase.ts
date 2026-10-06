import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// The session token guards the most private data in the app, so on a phone
// it lives in the iOS Keychain / Android Keystore via expo-secure-store.
// SecureStore caps a single value at 2048 bytes and a Supabase session is
// often bigger, so values are split into chunks under one index key.
const CHUNK = 1800;
const chunkedSecureStore: SupportedStorage = {
  async getItem(key) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key, value) {
    const count = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    const old = Number(await SecureStore.getItemAsync(`${key}.n`));
    for (let i = count; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.setItemAsync(`${key}.n`, String(count));
  },
  async removeItem(key) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

// On the web (laptop / Mac mini in a browser) supabase-js uses localStorage
// by default, which is the right call there.
export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'anon', {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: chunkedSecureStore }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
