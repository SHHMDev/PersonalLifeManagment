import { LocalNotifications } from '@capacitor/local-notifications';

export async function ensureNotificationPermission(): Promise<void> {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    await LocalNotifications.requestPermissions();
  }
}

export async function scheduleRecurringReminder(id: number, title: string, body: string, scheduleAt: Date): Promise<void> {
  await ensureNotificationPermission();
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { at: scheduleAt },
        sound: undefined
      }
    ]
  });
}
