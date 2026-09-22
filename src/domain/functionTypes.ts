import type { FunctionType, PaymentType } from './models';

/**
 * Presentation metadata for function types. Emoji is used as the list icon —
 * it renders identically on iOS and Android without shipping an icon set, and
 * reads instantly for the mixed-literacy audience this app targets.
 */
export interface FunctionTypeMeta {
  value: FunctionType;
  label: string;
  /** Tamil label, shown when the app language is set to Tamil. */
  labelTa: string;
  emoji: string;
  tint: string;
}

export const FUNCTION_TYPES: FunctionTypeMeta[] = [
  { value: 'wedding', label: 'Wedding', labelTa: 'திருமணம்', emoji: '💍', tint: '#DB2777' },
  { value: 'ear_piercing', label: 'Ear Piercing', labelTa: 'காது குத்து', emoji: '🪔', tint: '#E8912A' },
  { value: 'house_warming', label: 'House Warming', labelTa: 'கிரகப்பிரவேசம்', emoji: '🏡', tint: '#0FA968' },
  { value: 'baby_shower', label: 'Baby Shower', labelTa: 'வளைகாப்பு', emoji: '🍼', tint: '#2563EB' },
  { value: 'birthday', label: 'Birthday', labelTa: 'பிறந்தநாள்', emoji: '🎁', tint: '#9333EA' },
  { value: 'puberty', label: 'Puberty Function', labelTa: 'மஞ்சள் நீராட்டு விழா', emoji: '🌼', tint: '#CA8A04' },
  { value: 'upanayanam', label: 'Upanayanam', labelTa: 'உபநயனம்', emoji: '🪢', tint: '#0891B2' },
  { value: 'engagement', label: 'Engagement', labelTa: 'நிச்சயதார்த்தம்', emoji: '💐', tint: '#DB2777' },
  { value: 'funeral', label: 'Funeral', labelTa: 'இறுதிச் சடங்கு', emoji: '🕊️', tint: '#5A5B77' },
  { value: 'other', label: 'Other', labelTa: 'மற்றவை', emoji: '✨', tint: '#5B21B6' },
];

const BY_VALUE = new Map(FUNCTION_TYPES.map((t) => [t.value, t]));

export function functionTypeMeta(type: FunctionType): FunctionTypeMeta {
  return BY_VALUE.get(type) ?? BY_VALUE.get('other')!;
}

export interface PaymentTypeMeta {
  value: PaymentType;
  label: string;
  icon: 'cash' | 'phone-portrait' | 'ellipsis-horizontal-circle';
}

export const PAYMENT_TYPES: PaymentTypeMeta[] = [
  { value: 'cash', label: 'Cash', icon: 'cash' },
  { value: 'upi', label: 'UPI', icon: 'phone-portrait' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle' },
];

export function paymentTypeMeta(type: PaymentType): PaymentTypeMeta {
  return PAYMENT_TYPES.find((p) => p.value === type) ?? PAYMENT_TYPES[2];
}
