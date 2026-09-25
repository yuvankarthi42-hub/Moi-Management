/**
 * Dialling codes offered on the sign-up and sign-in forms.
 *
 * India first because that is where the moi book lives; the rest are where
 * Tamil families most often are when they still owe one.
 */
export interface CountryCode {
  code: string;
  label: string;
  flag: string;
  /** Expected national-number length, used only for the input's maxLength. */
  digits: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', label: 'India', flag: '🇮🇳', digits: 10 },
  { code: '+65', label: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: '+60', label: 'Malaysia', flag: '🇲🇾', digits: 10 },
  { code: '+971', label: 'UAE', flag: '🇦🇪', digits: 9 },
  { code: '+94', label: 'Sri Lanka', flag: '🇱🇰', digits: 9 },
  { code: '+44', label: 'United Kingdom', flag: '🇬🇧', digits: 10 },
  { code: '+1', label: 'United States', flag: '🇺🇸', digits: 10 },
  { code: '+61', label: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: '+64', label: 'New Zealand', flag: '🇳🇿', digits: 9 },
  { code: '+974', label: 'Qatar', flag: '🇶🇦', digits: 8 },
  { code: '+968', label: 'Oman', flag: '🇴🇲', digits: 8 },
  { code: '+966', label: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0];

export function countryByCode(code: string): CountryCode {
  return COUNTRY_CODES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}
