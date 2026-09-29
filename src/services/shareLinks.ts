/**
 * Deep links to a specific person's WhatsApp chat or SMS conversation.
 *
 * Neither of these is an API. Both are plain URLs that hand a chat window,
 * pre-filled, to the same free app already on the phone (or WhatsApp Web on
 * desktop) — the person using the app still presses Send themselves, exactly
 * as if they had typed the message by hand. There is no account, no key, no
 * per-message charge on our side.
 */

interface Contact {
  phone?: string;
  /** Dialling code including the plus, e.g. "+91". Falls back to +91 — the
   * one code this app supported before `Person.countryCode` existed. */
  countryCode?: string;
}

const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/**
 * `wa.me`'s click-to-chat address: the full number, digits only, no `+`.
 * Undefined when there is no number at all — nothing to build a link to.
 */
export function buildWhatsAppUrl(contact: Contact, text: string): string | undefined {
  if (!contact.phone) return undefined;
  const code = digitsOnly(contact.countryCode ?? '+91');
  const number = digitsOnly(contact.phone);
  return `https://wa.me/${code}${number}?text=${encodeURIComponent(text)}`;
}

/**
 * The `sms:` URI scheme, whose one inconsistency across platforms is the
 * separator before the body: iOS wants `&`, Android wants `?`. `platform`
 * takes a plain string rather than importing `Platform` here, so this stays a
 * pure function a test can drive across every value without touching
 * react-native at all; the real call site passes `Platform.OS`.
 */
export function buildSmsUrl(
  contact: Contact,
  text: string,
  platform: string,
): string | undefined {
  if (!contact.phone) return undefined;
  const code = contact.countryCode ?? '+91';
  const number = digitsOnly(contact.phone);
  const separator = platform === 'ios' ? '&' : '?';
  return `sms:${code}${number}${separator}body=${encodeURIComponent(text)}`;
}
