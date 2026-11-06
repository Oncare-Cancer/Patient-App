import Toast from 'react-native-toast-message';

/**
 * Thin wrapper over react-native-toast-message, which is already mounted in
 * app/_layout.tsx.
 *
 * It exists so screens do not each decide their own durations and types, and so
 * the one rule that matters is enforced in a single place: a toast is for
 * feedback the patient can ignore. Anything they must act on — a failed
 * submission, an expired session, a price to confirm — belongs in the screen or
 * a sheet, where it cannot disappear after three seconds unread.
 */

export function toastSuccess(message: string, detail?: string) {
  Toast.show({
    type: 'success',
    text1: message,
    text2: detail,
    position: 'bottom',
    // Clear of the floating nav so it does not cover the Book button.
    bottomOffset: 96,
    visibilityTime: 2600,
  });
}

export function toastError(message: string, detail?: string) {
  Toast.show({
    type: 'error',
    text1: message,
    text2: detail,
    position: 'bottom',
    bottomOffset: 96,
    // Longer than success: an error is usually read twice.
    visibilityTime: 4000,
  });
}

export function toastInfo(message: string, detail?: string) {
  Toast.show({
    type: 'info',
    text1: message,
    text2: detail,
    position: 'bottom',
    bottomOffset: 96,
    visibilityTime: 3000,
  });
}

export function hideToast() {
  Toast.hide();
}
