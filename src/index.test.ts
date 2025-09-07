import { describe, it, expect } from "vitest";
import mic, { MicImpl } from "./index.js";
import { Mic } from "./Mic.js";
import { IsSilence } from "./IsSilence.js";
import type { MicOptions } from "./MicOptions.js";

describe("index.ts", () => {
  it("should export a function as default export", () => {
    expect(typeof mic).toBe("function");
  });

  it("should export MicImpl class", () => {
    expect(MicImpl).toBeDefined();
    expect(typeof MicImpl).toBe("function");
  });

  it("should export Mic abstract class", () => {
    expect(Mic).toBeDefined();
    expect(typeof Mic).toBe("function");
  });

  it("should create MicImpl instance when calling mic()", () => {
    const micInstance = mic();
    expect(micInstance).toBeInstanceOf(MicImpl);
    // Check that it has all the required methods
    expect(typeof micInstance.start).toBe("function");
    expect(typeof micInstance.stop).toBe("function");
    expect(typeof micInstance.pause).toBe("function");
    expect(typeof micInstance.resume).toBe("function");
    expect(typeof micInstance.getAudioStream).toBe("function");
  });

  it("should pass options to MicImpl constructor", () => {
    const options: MicOptions = {
      debug: true,
      exitOnSilence: 5,
      bitwidth: "24",
      endian: "big",
      channels: "2",
      rate: "44100",
      encoding: "unsigned-integer",
      fileType: "wav",
    };

    const micInstance = mic(options);
    expect(micInstance).toBeInstanceOf(MicImpl);

    // Verify the options were applied by checking the audio stream
    const audioStream = micInstance.getAudioStream() as IsSilence;
    expect(audioStream.getNumSilenceFramesExitThresh()).toBe(5);
  });

  it("should use default options when none provided", () => {
    const micInstance = mic();
    expect(micInstance).toBeInstanceOf(MicImpl);

    // Verify default options were applied
    const audioStream = micInstance.getAudioStream() as IsSilence;
    expect(audioStream.getNumSilenceFramesExitThresh()).toBe(0);
  });

  it("should handle empty options object", () => {
    const micInstance = mic({});
    expect(micInstance).toBeInstanceOf(MicImpl);

    // Verify default options were applied
    const audioStream = micInstance.getAudioStream() as IsSilence;
    expect(audioStream.getNumSilenceFramesExitThresh()).toBe(0);
  });

  it("should create multiple independent instances", () => {
    const mic1 = mic({ exitOnSilence: 1 });
    const mic2 = mic({ exitOnSilence: 2 });

    const audioStream1 = mic1.getAudioStream() as IsSilence;
    const audioStream2 = mic2.getAudioStream() as IsSilence;

    expect(audioStream1.getNumSilenceFramesExitThresh()).toBe(1);
    expect(audioStream2.getNumSilenceFramesExitThresh()).toBe(2);
  });

  it("should maintain backward compatibility with original mic API", () => {
    // Test that the factory function works like the original mic package
    const micInstance = mic({
      rate: "16000",
      channels: "1",
      bitwidth: "16",
      encoding: "signed-integer",
      endian: "little",
      fileType: "raw",
      debug: false,
      exitOnSilence: 0,
    });

    expect(micInstance).toBeInstanceOf(MicImpl);

    // Verify all required methods exist
    expect(typeof micInstance.start).toBe("function");
    expect(typeof micInstance.stop).toBe("function");
    expect(typeof micInstance.pause).toBe("function");
    expect(typeof micInstance.resume).toBe("function");
    expect(typeof micInstance.getAudioStream).toBe("function");
  });
});
