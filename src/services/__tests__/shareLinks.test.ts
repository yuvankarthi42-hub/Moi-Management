import { buildSmsUrl, buildWhatsAppUrl } from '../shareLinks';

describe('buildWhatsAppUrl', () => {
  it('builds the click-to-chat address: country code + number, no plus, no spaces', () => {
    const url = buildWhatsAppUrl({ phone: '98765 43210', countryCode: '+91' }, 'Hello');
    expect(url).toBe('https://wa.me/919876543210?text=Hello');
  });

  it('url-encodes the message text', () => {
    const url = buildWhatsAppUrl({ phone: '9876543210', countryCode: '+91' }, 'Hi & bye');
    expect(url).toContain(encodeURIComponent('Hi & bye'));
    expect(url).not.toContain('Hi & bye');
  });

  it('defaults to +91 when the contact has no country code stored', () => {
    const url = buildWhatsAppUrl({ phone: '9876543210' }, 'Hi');
    expect(url).toBe('https://wa.me/919876543210?text=Hi');
  });

  it('honours a non-Indian country code', () => {
    const url = buildWhatsAppUrl({ phone: '7911123456', countryCode: '+44' }, 'Hi');
    expect(url).toBe('https://wa.me/447911123456?text=Hi');
  });

  it('is undefined with no phone number at all — nothing to link to', () => {
    expect(buildWhatsAppUrl({}, 'Hi')).toBeUndefined();
    expect(buildWhatsAppUrl({ countryCode: '+91' }, 'Hi')).toBeUndefined();
  });
});

describe('buildSmsUrl', () => {
  it('uses & before body on iOS', () => {
    const url = buildSmsUrl({ phone: '9876543210', countryCode: '+91' }, 'Hi', 'ios');
    expect(url).toBe('sms:+919876543210&body=Hi');
  });

  it('uses ? before body on android', () => {
    const url = buildSmsUrl({ phone: '9876543210', countryCode: '+91' }, 'Hi', 'android');
    expect(url).toBe('sms:+919876543210?body=Hi');
  });

  it('treats anything other than ios as the ? form, web included', () => {
    expect(buildSmsUrl({ phone: '9876543210' }, 'Hi', 'web')).toBe('sms:+919876543210?body=Hi');
  });

  it('defaults to +91 when the contact has no country code stored', () => {
    expect(buildSmsUrl({ phone: '9876543210' }, 'Hi', 'android')).toBe('sms:+919876543210?body=Hi');
  });

  it('is undefined with no phone number at all', () => {
    expect(buildSmsUrl({}, 'Hi', 'ios')).toBeUndefined();
  });
});
