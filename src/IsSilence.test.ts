import { describe, it, expect } from "vitest";
import { IsSilence } from "./IsSilence.js";

describe("IsSilence", () => {
  it("should initialize with zero consecutive silence count and zero exit threshold", () => {
    const isSilence = new IsSilence({ debug: false });
    expect(isSilence.getConsecSilenceCount()).toBe(0);
    expect(isSilence.getNumSilenceFramesExitThresh()).toBe(0);
  });

  it("should allow setting and getting numSilenceFramesExitThresh", () => {
    const isSilence = new IsSilence({ debug: false });
    isSilence.setNumSilenceFramesExitThresh(5);
    expect(isSilence.getNumSilenceFramesExitThresh()).toBe(5);
  });

  it("should increment and reset consecutive silence count", () => {
    const isSilence = new IsSilence({ debug: false });
    const firstCount = isSilence.incrConsecSilenceCount();
    expect(firstCount).toBe(1);
    expect(isSilence.getConsecSilenceCount()).toBe(1);
    isSilence.resetConsecSilenceCount();
    expect(isSilence.getConsecSilenceCount()).toBe(0);
  });
});

describe("IsSilence transform behavior", () => {
  it("should push data through unchanged", async () => {
    const isSilence = new IsSilence({ debug: false });
    const input = Buffer.from([0, 1, 2, 3]);
    const chunks: Buffer[] = [];
    isSilence.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    const finished = new Promise<void>((resolve) => {
      isSilence.on("end", resolve);
    });
    isSilence.end(input);
    await finished;
    const output = Buffer.concat(chunks);
    expect(output).toEqual(input);
  });

  it("should emit silence event after threshold frames of silence", async () => {
    const isSilence = new IsSilence({ debug: false });
    isSilence.setNumSilenceFramesExitThresh(2);
    const silenceEvent = new Promise<void>((resolve) => {
      isSilence.on("silence", resolve);
    });
    isSilence.write(Buffer.from([0, 0])); // first silent frame
    isSilence.write(Buffer.from([0, 0])); // second silent frame, should trigger
    await silenceEvent;
  });

  it("should emit sound event when speech is detected after threshold", async () => {
    const isSilence = new IsSilence({ debug: false });
    isSilence.setNumSilenceFramesExitThresh(1);
    // simulate previous silence exceeding threshold
    isSilence.incrConsecSilenceCount();
    isSilence.incrConsecSilenceCount();
    const soundEvent = new Promise<void>((resolve) => {
      isSilence.on("sound", resolve);
    });
    // speech frame: next byte 10 => speechSample = 10*256 + 10 = 2570 > 2000
    isSilence.write(Buffer.from([0, 10]));
    await soundEvent;
  });

  it("should handle empty input buffer", async () => {
    const isSilence = new IsSilence({ debug: false });
    const chunks: Buffer[] = [];
    isSilence.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    const finished = new Promise<void>((resolve) => {
      isSilence.on("end", resolve);
    });
    isSilence.end(Buffer.from([]));
    await finished;
    expect(chunks.length).toBe(0);
  });

  it("should handle exactly threshold number of silent frames", async () => {
    const isSilence = new IsSilence({ debug: false });
    isSilence.setNumSilenceFramesExitThresh(2);
    const silenceEvent = new Promise<void>((resolve) => {
      isSilence.on("silence", resolve);
    });
    isSilence.write(Buffer.from([0, 0])); // first silent frame
    isSilence.write(Buffer.from([0, 0])); // second silent frame, should trigger
    await silenceEvent;
  });

  it("should not emit silence event for one less than threshold", async () => {
    const isSilence = new IsSilence({ debug: false });
    isSilence.setNumSilenceFramesExitThresh(3);
    let silenceTriggered = false;
    isSilence.on("silence", () => {
      silenceTriggered = true;
    });
    isSilence.write(Buffer.from([0, 0])); // first silent frame
    isSilence.write(Buffer.from([0, 0])); // second silent frame
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    }); // wait to ensure no event
    expect(silenceTriggered).toBe(false);
  });
});
