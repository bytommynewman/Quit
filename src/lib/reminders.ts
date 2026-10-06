import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Local reminders only. Nothing leaves the phone. Two slots:
//  - evening check-in (default 21:00) — the risk window, and when the
//    one-minute check-in is quickest to do;
//  - a morning line (default 09:30) with the day number, so the day starts
//    with the count instead of the craving.
// Both can be turned off in Settings.

export const CHANNEL_ID = 'reminders';
export const EVENING_ID = 'evening-checkin';
export const MORNING_ID = 'morning-day';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type ReminderPrefs = { evening: boolean; morning: boolean; eveningHour: number; morningHour: number };
export const DEFAULT_REMINDERS: ReminderPrefs = { evening: true, morning: true, eveningHour: 21, morningHour: 9 };

// Re-schedules everything from scratch so it matches the prefs exactly.
export async function applyReminders(prefs: ReminderPrefs): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.evening && !prefs.morning) return true;
  const ok = await ensurePermission();
  if (!ok) return false;
  await ensureChannel();
  if (prefs.evening) {
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_ID,
      content: { title: 'Check in', body: 'Under a minute. How was today, honestly?' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.eveningHour, minute: 0, channelId: CHANNEL_ID },
    });
  }
  if (prefs.morning) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_ID,
      content: { title: 'Another day', body: 'Eat before the Vyvanse. Move once. Early night.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.morningHour, minute: 30, channelId: CHANNEL_ID },
    });
  }
  return true;
}

export function parsePrefs(raw: string | null): ReminderPrefs {
  if (!raw) return DEFAULT_REMINDERS;
  try {
    return { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULT_REMINDERS;
  }
}
