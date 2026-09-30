import { Platform } from 'react-native';

import { safeAreaFloor } from '../layout';

describe('safeAreaFloor', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('on native, returns the inset plus extra unchanged — the escape hatch never engages', () => {
    Platform.OS = 'ios';
    expect(safeAreaFloor(44, 'top')).toBe(44);
    expect(safeAreaFloor(44, 'top', 8)).toBe(52);
    expect(safeAreaFloor(0, 'bottom', 16)).toBe(16);
  });

  it('on web, ignores the JS-measured inset entirely and trusts env() instead', () => {
    Platform.OS = 'web';
    expect(safeAreaFloor(44, 'top')).toBe('calc(env(safe-area-inset-top, 0px) + 0px)');
    // The JS measurement is untrustworthy in either direction on web (both a
    // 0 that should be 44, and a bogus 44 that should be 0 look the same to
    // this function) — proven here by passing a different `inset` and
    // getting an identical result, since `inset` never reaches the string.
    expect(safeAreaFloor(0, 'top')).toBe(safeAreaFloor(44, 'top'));
  });

  it('on web, keeps extra breathing room outside the env() term — a design gap, not part of the inset', () => {
    Platform.OS = 'web';
    expect(safeAreaFloor(0, 'bottom', 60)).toBe('calc(env(safe-area-inset-bottom, 0px) + 60px)');
  });

  it('on web, reads the requested side back out of the generated env() call', () => {
    Platform.OS = 'web';
    expect(safeAreaFloor(0, 'left')).toContain('env(safe-area-inset-left,');
    expect(safeAreaFloor(0, 'right')).toContain('env(safe-area-inset-right,');
  });
});
