export function shouldApplyIOSInputZoomFix(platformOS, userAgent) {
  return platformOS === 'web' && /iPad|iPhone|iPod/.test(String(userAgent || ''));
}
