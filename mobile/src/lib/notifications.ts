import * as Notifications from 'expo-notifications';

// Show reminders even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
