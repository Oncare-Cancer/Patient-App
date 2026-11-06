import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pending_intent';

/**
 * What a guest was doing when login interrupted them.
 *
 * Section 06 is explicit: "The selection (doctor, slot, cart, form) is kept and
 * shown as 'Your selection is saved'", and "After OTP the patient returns to the
 * same step with fields filled in" (B6).
 *
 * Stored rather than passed through navigation params because login replaces the
 * whole stack — the guest route is gone by the time the patient comes back, so
 * there is nothing to return to in memory.
 */
export type PendingIntent =
  | {
      kind: 'booking';
      /** Human summary for the login sheet's "Your selection is saved" line. */
      summary: string;
      centreId?: string;
      centreName?: string;
      doctorId?: string;
      doctorName?: string;
      visitTypeName?: string;
      dateTime?: string;
    }
  | {
      kind: 'labTests';
      summary: string;
      pincode?: string;
      /** Catalogue ids the guest had ticked. */
      testIds: string[];
    }
  | {
      kind: 'medicines';
      summary: string;
      medicineIds: string[];
    }
  | {
      kind: 'route';
      summary: string;
      /** Somewhere to land, for locked tabs with nothing else to restore. */
      path: string;
    };

/**
 * Intents older than this are dropped on read.
 *
 * A slot chosen yesterday is almost certainly gone, and silently restoring it
 * would send the patient to a confirm screen for an appointment that cannot be
 * booked. Thirty minutes covers a login round-trip including an OTP that took a
 * few tries.
 */
const MAX_AGE_MS = 30 * 60 * 1000;

type Stored = { intent: PendingIntent; savedAt: number };

export async function savePendingIntent(intent: PendingIntent): Promise<void> {
  const payload: Stored = { intent, savedAt: Date.now() };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Losing the intent costs the patient a re-selection, not the session.
  }
}

/** Reads without consuming, so the login sheet can show the summary. */
export async function peekPendingIntent(): Promise<PendingIntent | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      await clearPendingIntent();
      return null;
    }
    return parsed.intent;
  } catch {
    return null;
  }
}

/**
 * Reads and removes. Call this once after login so a stale intent cannot
 * hijack a later navigation.
 */
export async function takePendingIntent(): Promise<PendingIntent | null> {
  const intent = await peekPendingIntent();
  await clearPendingIntent();
  return intent;
}

export async function clearPendingIntent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
}

/**
 * Where to send the patient after login to land on the step they left.
 *
 * Returns null for intents with nothing to resume, so the caller falls through
 * to the normal post-login home.
 */
export function resumePathFor(
  intent: PendingIntent
): { pathname: string; params?: Record<string, string> } | null {
  switch (intent.kind) {
    case 'booking':
      return {
        pathname: '/(tabs)/book',
        params: {
          resumeCentreId: intent.centreId ?? '',
          resumeDoctorId: intent.doctorId ?? '',
          resumeVisitType: intent.visitTypeName ?? '',
          resumeDateTime: intent.dateTime ?? '',
        },
      };
    case 'labTests':
      return {
        pathname: '/services/lab-tests',
        params: {
          resumeTestIds: intent.testIds.join(','),
          resumePincode: intent.pincode ?? '',
        },
      };
    case 'medicines':
      return {
        pathname: '/services/medicines',
        params: { resumeMedicineIds: intent.medicineIds.join(',') },
      };
    case 'route':
      return { pathname: intent.path };
    default:
      return null;
  }
}
