import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearConsent, readConsent, recordConsent } from '../consentCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: (() => {
    const store = new Map<string, string>();
    return {
      getItem: jest.fn((k: string) => Promise.resolve(store.has(k) ? store.get(k) : null)),
      setItem: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve();
      }),
    };
  })(),
}));

describe('consentCache', () => {
  afterEach(async () => {
    await clearConsent();
    jest.clearAllMocks();
  });

  it('reports no consent on a fresh device', async () => {
    expect(await readConsent()).toBeUndefined();
  });

  it('round-trips a consent record with a timestamp', async () => {
    await recordConsent();
    const record = await readConsent();
    expect(record).toBeDefined();
    expect(record!.agreedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('clears what was recorded, so a reinstall starts fresh', async () => {
    await recordConsent();
    await clearConsent();
    expect(await readConsent()).toBeUndefined();
  });

  it('ignores a stored row missing agreedAt — a safer default than treating junk as consent', async () => {
    const mocked = AsyncStorage as unknown as { setItem: (k: string, v: string) => Promise<void> };
    await mocked.setItem('moi.consent.v1', JSON.stringify({ nothingUseful: true }));
    expect(await readConsent()).toBeUndefined();
  });

  it('swallows storage errors so a broken store never breaks sign-in', async () => {
    const mocked = AsyncStorage as unknown as {
      getItem: jest.Mock; setItem: jest.Mock; removeItem: jest.Mock;
    };
    mocked.getItem.mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(readConsent()).resolves.toBeUndefined();

    mocked.setItem.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(recordConsent()).resolves.toBeUndefined();

    mocked.removeItem.mockRejectedValueOnce(new Error('locked'));
    await expect(clearConsent()).resolves.toBeUndefined();
  });
});
