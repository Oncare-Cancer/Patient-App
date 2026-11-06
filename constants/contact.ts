/**
 * Phone numbers, in one place.
 *
 * Issue #10 in the PDF: the app showed 9667040054 while the website shows
 * +91 96679 40053. One of them is wrong and Ops has to confirm which
 * (section 19, "Correct support number and SOS escalation numbers per centre").
 * Until then both live here so the fix is a one-line change, and no screen
 * hardcodes a number again.
 */

/** TODO(ops): confirm against the website before release — see issue #10. */
export const SUPPORT_NUMBER = '+919667940053';

/** Shown as typed, so the design's spacing is preserved. */
export const SUPPORT_NUMBER_DISPLAY = '+91 96679 40053';

/** India's single emergency number. Never make this configurable. */
export const EMERGENCY_NUMBER = '112';

export const WHATSAPP_NUMBER = '+919667940053';
