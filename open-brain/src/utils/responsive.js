export const SECOND_BRAIN_HEADER_DATE_BREAKPOINT = 640;

export function shouldShowSecondBrainHeaderDate(width) {
  return Number(width) > SECOND_BRAIN_HEADER_DATE_BREAKPOINT;
}

export function shouldApplyIOSInputZoomFix(platformOS, userAgent) {
  return (
    platformOS === "web" && /iPad|iPhone|iPod/.test(String(userAgent || ""))
  );
}
