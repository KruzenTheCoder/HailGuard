import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Ensure the foreground notification handler is registered.
import '@/lib/notifications';
import { supabase } from '@/lib/supabase';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Register this device's Expo push token against the signed-in user so the
 * server (push-dispatch Edge Function) can deliver alerts. Best-effort: returns
 * silently on simulators, missing permissions, or no EAS project id.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (isExpoGo) return; // Expo Go on SDK 53+ can't mint Android push tokens.
    if (!Device.isDevice) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    let granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return; // a token can't be minted without an EAS project id

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('push_tokens')
      .upsert({ user_id: user.id, token, platform: Platform.OS }, { onConflict: 'token' });
  } catch {
    // Push registration is a best-effort enhancement; never surface errors.
  }
}
