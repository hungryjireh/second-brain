import { createBrainstormTalkStreamingTransport } from "../brainstormTalkStreamingTransport";

describe("brainstormTalkStreamingTransport", () => {
  it("delivers partial transcript events to subscriber", () => {
    const transport = createBrainstormTalkStreamingTransport();
    const onPartial = jest.fn();

    const unsubscribe = transport.subscribe(onPartial);
    transport.emitPartialTranscript("hello world");

    expect(onPartial).toHaveBeenCalledWith("hello world");
    expect(typeof unsubscribe).toBe("function");
  });

  it("stops emitting after unsubscribe", () => {
    const transport = createBrainstormTalkStreamingTransport();
    const onPartial = jest.fn();

    const unsubscribe = transport.subscribe(onPartial);
    unsubscribe();
    transport.emitPartialTranscript("should not emit");

    expect(onPartial).not.toHaveBeenCalled();
  });

  it("start and stop resolve without throwing", async () => {
    const transport = createBrainstormTalkStreamingTransport();

    await expect(transport.start()).resolves.toBeUndefined();
    await expect(transport.stop()).resolves.toBeUndefined();
  });
});
