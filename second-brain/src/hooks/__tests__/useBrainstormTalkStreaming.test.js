import { useEffect } from "react";
import { act, render } from "@testing-library/react-native";
import useBrainstormTalkStreaming from "../useBrainstormTalkStreaming";

describe("useBrainstormTalkStreaming", () => {
  let latestValue = null;

  function Harness(props) {
    const value = useBrainstormTalkStreaming(props);
    useEffect(() => {
      latestValue = value;
    }, [value]);
    return null;
  }

  beforeEach(() => {
    latestValue = null;
    jest.clearAllMocks();
  });

  it("ingests only stable partials above threshold and with increased word count", async () => {
    const onStablePartial = jest.fn(async () => {});
    render(
      <Harness
        enabled
        minimumWords={4}
        onStablePartial={onStablePartial}
        transport={null}
      />,
    );

    await act(async () => {
      await latestValue.ingestResolvedTranscript("one two three", {});
      await latestValue.ingestResolvedTranscript("one two three four", {});
      await latestValue.ingestResolvedTranscript("one two three four", {});
      await latestValue.ingestResolvedTranscript("one two three four five", {});
    });

    expect(onStablePartial).toHaveBeenCalledTimes(2);
    expect(onStablePartial).toHaveBeenNthCalledWith(
      1,
      "one two three four",
      {},
    );
    expect(onStablePartial).toHaveBeenNthCalledWith(
      2,
      "one two three four five",
      {},
    );
  });

  it("starts and stops transport, forwarding transport partial events", async () => {
    const onStablePartial = jest.fn(async () => {});
    let listener = null;
    const transport = {
      start: jest.fn(async () => {}),
      stop: jest.fn(async () => {}),
      subscribe: jest.fn((fn) => {
        listener = fn;
        return () => {
          listener = null;
        };
      }),
    };

    render(
      <Harness
        enabled
        minimumWords={2}
        onStablePartial={onStablePartial}
        transport={transport}
      />,
    );

    await act(async () => {
      await latestValue.startStreamingTransport({ id: "session-1" });
    });
    expect(transport.subscribe).toHaveBeenCalledTimes(1);
    expect(transport.start).toHaveBeenCalledWith({ id: "session-1" });

    await act(async () => {
      await listener?.("hello world");
    });
    expect(onStablePartial).toHaveBeenCalledWith("hello world", {
      id: "session-1",
    });

    await act(async () => {
      await latestValue.stopStreamingTransport();
    });
    expect(transport.stop).toHaveBeenCalledTimes(1);
    expect(listener).toBeNull();
  });

  it("resetStreamingProgress allows same-length partial to be processed again", async () => {
    const onStablePartial = jest.fn(async () => {});
    render(
      <Harness
        enabled
        minimumWords={2}
        onStablePartial={onStablePartial}
        transport={null}
      />,
    );

    await act(async () => {
      await latestValue.ingestResolvedTranscript("hello world", "ctx1");
    });
    await act(async () => {
      await latestValue.ingestResolvedTranscript("hello world", "ctx2");
    });
    expect(onStablePartial).toHaveBeenCalledTimes(1);

    latestValue.resetStreamingProgress();
    await act(async () => {
      await latestValue.ingestResolvedTranscript("hello world", "ctx3");
    });
    expect(onStablePartial).toHaveBeenCalledTimes(2);
    expect(onStablePartial).toHaveBeenLastCalledWith("hello world", "ctx3");
  });
});
