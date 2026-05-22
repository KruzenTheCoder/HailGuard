import Constants, { ExecutionEnvironment } from 'expo-constants';

// Expo Go on SDK 53+ no longer ships the remote-notifications runtime on
// Android, so even importing expo-notifications logs errors at module load.
// We lazy-require the module behind this guard so it is never touched in Expo
// Go — push features only run in development/production builds.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

function loadNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

const Notifications = loadNotifications();

if (Notifications) {
  // Show reminders even when the app is foregrounded.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type ExpiryReminder = {
  /** Stable key, e.g. "prdp" or "roadworthy:<vehicleId>". */
  key: string;
  label: string;
  /** ISO date string the document expires on. */
  date: string;
};

const DAY = 86_400_000;
// Alert the driver this many days before expiry (plus on the day itself).
const LEAD_DAYS = [30, 15, 0];

export async function ensurePermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * Replace all scheduled HailGuard reminders with freshly-computed ones for the
 * given documents. Only future thresholds are scheduled. Best-effort — never
 * throws into the UI.
 */
export async function syncExpiryReminders(items: ExpiryReminder[]): Promise<void> {
  if (!Notifications) return;
  try {
    if (!(await ensurePermissions())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    for (const item of items) {
      const expiryMs = Date.parse(item.date);
      if (Number.isNaN(expiryMs)) continue;

      for (const lead of LEAD_DAYS) {
        const fireAt = expiryMs - lead * DAY;
        if (fireAt <= now) continue;
        const body =
          lead === 0
            ? `${item.label} expires today. Renew to stay compliant.`
            : `${item.label} expires in ${lead} days. Renew soon to avoid suspension.`;
        await Notifications.scheduleNotificationAsync({
          content: { title: 'HailGuard compliance', body },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(fireAt),
          },
        });
      }
    }
  } catch {
    // Notifications are a best-effort enhancement; ignore failures.
  }
}
