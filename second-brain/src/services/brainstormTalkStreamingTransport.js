export function createBrainstormTalkStreamingTransport() {
  let partialListener = null;

  return {
    async start() {
      // Phase scaffold: real streaming session starts in a later step.
    },
    async stop() {
      // Phase scaffold: real streaming session stop will be added later.
    },
    subscribe(onPartialTranscript) {
      partialListener =
        typeof onPartialTranscript === "function" ? onPartialTranscript : null;
      return () => {
        partialListener = null;
      };
    },
    // Internal helper for future integration tests.
    emitPartialTranscript(partialText) {
      partialListener?.(partialText);
    },
  };
}
