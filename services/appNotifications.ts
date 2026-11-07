import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * The patient's notification history.
 *
 * Named `appNotifications` to keep it clear of `services/notifications.ts`,
 * which is a different thing entirely: that one registers the device with
 * Firebase and handles a push arriving. This one is the LIST — what was sent,
 * what is unread, and marking it seen.
 *
 * That list is new. Notifications used to be pushed and never stored, so the
 * Notifications tab had no history it could show and was empty for everybody.
 * The backend now records every one (see helper/notifications.js there).
 */

export type AppNotificationType =
  | 'appointment'
  | 'request'
  | 'document'
  | 'general';

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  /**
   * Where tapping it should go — `{ requestId }` for a service request,
   * `{ appointmentId }` for a booking. Free-form because the backend adds
   * context per type, and the screen only reads the keys it knows.
   */
  data: Record<string, unknown>;
  read: boolean;
  /** ISO timestamp. */
  createdAt: string;
};

export type NotificationPage = {
  list: AppNotification[];
  totalCount: number;
  unreadCount: number;
};

const toNotification = (n: any): AppNotification => ({
  id: String(n?.id ?? ''),
  type: (['appointment', 'request', 'document', 'general'] as const).includes(
    n?.type
  )
    ? n.type
    : 'general',
  title: String(n?.title ?? ''),
  body: String(n?.body ?? ''),
  data: n?.data && typeof n.data === 'object' ? n.data : {},
  read: Boolean(n?.read),
  createdAt: String(n?.createdAt ?? ''),
});

/**
 * One page of notifications, newest first.
 *
 * The unread count comes back with the list rather than from a second call,
 * because the screen and the badge need the same number and two requests
 * could disagree.
 */
export async function listNotifications(params?: {
  index?: number;
  limit?: number;
}): Promise<NotificationPage> {
  const query = new URLSearchParams();
  query.set('index', String(params?.index ?? 0));
  query.set('limit', String(params?.limit ?? 20));

  const res = await fetchWrapper<any>(`/notifications?${query}`);
  const data = res?.data ?? {};
  return {
    list: Array.isArray(data.list) ? data.list.map(toNotification) : [],
    totalCount: Number(data.totalCount ?? 0),
    unreadCount: Number(data.unreadCount ?? 0),
  };
}

/** Just the badge number, for screens that do not load the list. */
export async function unreadNotificationCount(): Promise<number> {
  try {
    const res = await fetchWrapper<any>('/notifications/unread-count');
    return Number(res?.data?.unreadCount ?? 0);
  } catch {
    // A badge is not worth an error state; absent is the honest fallback.
    return 0;
  }
}

/**
 * Marks notifications read. Omit `ids` to mark all of them.
 *
 * Returns the new unread count so the caller does not have to re-fetch to
 * update a badge.
 */
export async function markNotificationsRead(
  ids?: string[]
): Promise<number | null> {
  try {
    const res = await fetchWrapper<any>('/notifications/read', {
      method: 'POST',
      body: ids && ids.length > 0 ? { ids } : {},
    });
    const count = res?.data?.unreadCount;
    return typeof count === 'number' ? count : null;
  } catch {
    // Failing to mark something read must not interrupt reading it.
    return null;
  }
}
