import { shouldApplyIOSInputZoomFix } from '../src/utils/iosZoomFix';
import { shouldShowSecondBrainHeaderDate } from '../src/utils/responsive';

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

describe('shouldShowSecondBrainHeaderDate', () => {
  test('returns false at and below the small-screen breakpoint', () => {
    expect(shouldShowSecondBrainHeaderDate(640)).toBe(false);
    expect(shouldShowSecondBrainHeaderDate(480)).toBe(false);
  });

  test('returns true above the small-screen breakpoint', () => {
    expect(shouldShowSecondBrainHeaderDate(641)).toBe(true);
  });
});
