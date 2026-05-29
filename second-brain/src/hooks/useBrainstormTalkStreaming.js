import { useCallback, useRef } from "react";

export default function useBrainstormTalkStreaming({
  enabled,
  minimumWords = 8,
  onStablePartial,
  transport = null,
}) {
  const latestWordCountRef = useRef(0);
  const unsubscribeRef = useRef(null);
  const streamingStartedRef = useRef(false);

  const resetStreamingProgress = useCallback(() => {
    latestWordCountRef.current = 0;
  }, []);

  const ingestResolvedTranscript = useCallback(
    async (transcriptText, context) => {
      if (!enabled) return;
      const normalized = String(transcriptText || "").trim();
      if (!normalized) return;
      const words = normalized.split(/\s+/);
      if (words.length < minimumWords) return;
      if (words.length <= latestWordCountRef.current) return;
      latestWordCountRef.current = words.length;
      if (typeof onStablePartial === "function") {
        await onStablePartial(normalized, context);
      }
    },
    [enabled, minimumWords, onStablePartial],
  );

  const startStreamingTransport = useCallback(
    async (context) => {
      if (!enabled || !transport || streamingStartedRef.current) return;
      const unsubscribe = transport.subscribe?.((partialText) =>
        ingestResolvedTranscript(partialText, context),
      );
      if (typeof unsubscribe === "function") {
        unsubscribeRef.current = unsubscribe;
      }
      await transport.start?.(context);
      streamingStartedRef.current = true;
    },
    [enabled, ingestResolvedTranscript, transport],
  );

  const stopStreamingTransport = useCallback(async () => {
    if (!transport || !streamingStartedRef.current) return;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    await transport.stop?.();
    streamingStartedRef.current = false;
  }, [transport]);

  return {
    ingestResolvedTranscript,
    resetStreamingProgress,
    startStreamingTransport,
    stopStreamingTransport,
  };
}
