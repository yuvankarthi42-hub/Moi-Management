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

  it('on web, floors the measured inset against env() rather than replacing it', () => {
    Platform.OS = 'web';
    expect(safeAreaFloor(44, 'top')).toBe('calc(max(44px, env(safe-area-inset-top)) + 0px)');
  });

  it('on web, keeps extra breathing room outside the max() — a design gap, not part of the inset', () => {
    Platform.OS = 'web';
    expect(safeAreaFloor(0, 'bottom', 60)).toBe('calc(max(0px, env(safe-area-inset-bottom)) + 60px)');
  });

  it('on web, reads the requested side back out of the generated env() call', () => {
    Platform.OS = 'web';
    expect(safeAreaFloor(0, 'left')).toContain('env(safe-area-inset-left)');
    expect(safeAreaFloor(0, 'right')).toContain('env(safe-area-inset-right)');
  });
});
