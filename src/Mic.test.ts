import { describe, it, expect, vi } from "vitest";
import { MicImpl } from "./Mic.js";
import { IsSilence } from "./IsSilence.js";

describe("MicImpl", () => {
  it("should emit startComplete when start is called", () => {
    const mic = new MicImpl();
    const audioStream = mic.getAudioStream();
    const startComplete = vi.fn();

    audioStream.on("startComplete", startComplete);
    mic.start();

    expect(startComplete).toHaveBeenCalledOnce();
  });

  it("should throw an error if start is called multiple times", () => {
    const mic = new MicImpl({ debug: true });
    mic.start();

    expect(() => mic.start()).toThrowError(
      "Duplicate calls to start(): Microphone already started!",
    );
  });

  it("should emit stopComplete when stop is called", () => {
    const mic = new MicImpl();
    const audioStream = mic.getAudioStream();
    const stopComplete = vi.fn();

    audioStream.on("stopComplete", stopComplete);
    mic.start();
    mic.stop();

    expect(stopComplete).toHaveBeenCalledOnce();
  });

  it("should emit pauseComplete when pause is called", () => {
    const mic = new MicImpl();
    const audioStream = mic.getAudioStream();
    const pauseComplete = vi.fn();

    audioStream.on("pauseComplete", pauseComplete);
    mic.start();
    mic.pause();

    expect(pauseComplete).toHaveBeenCalledOnce();
  });

  it("should emit resumeComplete when resume is called", () => {
    const mic = new MicImpl();
    const audioStream = mic.getAudioStream();
    const resumeComplete = vi.fn();

    audioStream.on("resumeComplete", resumeComplete);
    mic.start();
    mic.pause();
    mic.resume();

    expect(resumeComplete).toHaveBeenCalledOnce();
  });

  it("should return the audioStream instance", () => {
    const mic = new MicImpl();
    const audioStream = mic.getAudioStream();

    expect(audioStream).toBeInstanceOf(IsSilence);
  });

  it("should emit silence and sound events on audioStream", () => {
    const mic = new MicImpl({ exitOnSilence: 1 });
    const audioStream = mic.getAudioStream();
    const silenceEvent = vi.fn();
    const soundEvent = vi.fn();

    audioStream.on("silence", silenceEvent);
    audioStream.on("sound", soundEvent);

    mic.start();
    audioStream.write(Buffer.from([0, 0])); // Silent frame
    audioStream.write(Buffer.from([0, 0])); // Silent frame
    audioStream.write(Buffer.from([10, 10])); // Sound frame

    expect(silenceEvent).toHaveBeenCalledOnce();
    expect(soundEvent).toHaveBeenCalledOnce();
  });

  it("should handle stop without starting", () => {
    const mic = new MicImpl();
    expect(() => mic.stop()).not.toThrow();
  });

  it("should handle pause and resume without starting", () => {
    const mic = new MicImpl();
    expect(() => mic.pause()).not.toThrow();
    expect(() => mic.resume()).not.toThrow();
  });
});
