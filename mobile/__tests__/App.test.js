import { shouldApplyIOSInputZoomFix } from '../src/utils/iosZoomFix';

describe('shouldApplyIOSInputZoomFix', () => {
  test('returns true for iOS user agent on web', () => {
    expect(shouldApplyIOSInputZoomFix('web', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
  });

  test('returns false for non-web platforms', () => {
    expect(shouldApplyIOSInputZoomFix('ios', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
  });

  test('returns false for non-iOS user agent on web', () => {
    expect(shouldApplyIOSInputZoomFix('web', 'Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false);
  });
});
