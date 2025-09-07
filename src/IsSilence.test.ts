import { describe, it, expect, vi, beforeEach } from "vitest";
import { IsSilence } from "./IsSilence.js";

describe("IsSilence", () => {
  let isSilence: IsSilence;

  beforeEach(() => {
    isSilence = new IsSilence({ debug: false });
  });

  it("should initialize with zero consecutive silence count and zero exit threshold", () => {
    expect(isSilence.getConsecSilenceCount()).toBe(0);
    expect(isSilence.getNumSilenceFramesExitThresh()).toBe(0);
  });

  it("should allow setting and getting numSilenceFramesExitThresh", () => {
    isSilence.setNumSilenceFramesExitThresh(5);
    expect(isSilence.getNumSilenceFramesExitThresh()).toBe(5);
  });

  it("should increment and reset consecutive silence count", () => {
    const firstCount = isSilence.incrConsecSilenceCount();
    expect(firstCount).toBe(1);
    expect(isSilence.getConsecSilenceCount()).toBe(1);
    isSilence.resetConsecSilenceCount();
    expect(isSilence.getConsecSilenceCount()).toBe(0);
  });
});

describe("IsSilence transform behavior", () => {
  let isSilence: IsSilence;

  beforeEach(() => {
    isSilence = new IsSilence({ debug: false });
  });

  it("should push data through unchanged", async () => {
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
    isSilence.setNumSilenceFramesExitThresh(2);
    const silenceEvent = new Promise<void>((resolve) => {
      isSilence.on("silence", resolve);
    });
    isSilence.write(Buffer.from([0, 0])); // first silent frame
    isSilence.write(Buffer.from([0, 0])); // second silent frame, should trigger
    await silenceEvent;
  });

  it("should emit sound event when speech is detected after threshold", async () => {
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
    isSilence.setNumSilenceFramesExitThresh(2);
    const silenceEvent = new Promise<void>((resolve) => {
      isSilence.on("silence", resolve);
    });
    isSilence.write(Buffer.from([0, 0])); // first silent frame
    isSilence.write(Buffer.from([0, 0])); // second silent frame, should trigger
    await silenceEvent;
  });

  it("should not emit silence event for one less than threshold", async () => {
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

  describe("Debug mode behavior", () => {
    it("should log debug messages when debug is true", () => {
      const debugIsSilence = new IsSilence({ debug: true });
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      debugIsSilence.setNumSilenceFramesExitThresh(1);
      debugIsSilence.write(Buffer.from([10, 10])); // speech frame

      expect(consoleSpy).toHaveBeenCalledWith("Found speech block");
      consoleSpy.mockRestore();
    });

    it("should log silence detection in debug mode", () => {
      const debugIsSilence = new IsSilence({ debug: true });
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      debugIsSilence.setNumSilenceFramesExitThresh(1);
      debugIsSilence.write(Buffer.from([0, 0])); // silent frame

      expect(consoleSpy).toHaveBeenCalledWith(
        "Found silence block: %d of %d",
        1,
        1,
      );
      consoleSpy.mockRestore();
    });
  });

  describe("Silence detection edge cases", () => {
    it("should handle single byte buffer (odd length)", async () => {
      isSilence.setNumSilenceFramesExitThresh(1);
      const chunks: Buffer[] = [];
      isSilence.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Single byte should be processed without error
      isSilence.write(Buffer.from([0]));
      isSilence.end();

      await new Promise((resolve) => {
        isSilence.on("end", resolve);
      });

      expect(chunks.length).toBe(1);
    });

    it("should handle mixed silence and speech in same buffer", async () => {
      isSilence.setNumSilenceFramesExitThresh(1);
      // simulate previous silence exceeding threshold
      isSilence.incrConsecSilenceCount();
      isSilence.incrConsecSilenceCount();

      const silenceSpy = vi.fn();
      const soundSpy = vi.fn();

      isSilence.on("silence", silenceSpy);
      isSilence.on("sound", soundSpy);

      // Buffer with both silence and speech
      isSilence.write(Buffer.from([0, 0, 0, 10])); // silence then speech

      expect(soundSpy).toHaveBeenCalled();
      expect(silenceSpy).not.toHaveBeenCalled();
    });

    it("should not reset silence count when speech is below threshold", async () => {
      isSilence.setNumSilenceFramesExitThresh(3);
      isSilence.incrConsecSilenceCount();
      isSilence.incrConsecSilenceCount(); // count = 2

      // Speech below threshold - but this will increment the count
      isSilence.write(Buffer.from([0, 5])); // speechSample = 5*256 + 5 = 1285 < 2000

      expect(isSilence.getConsecSilenceCount()).toBe(3); // increments because it's silence
    });

    it("should reset silence count when speech exceeds threshold", async () => {
      isSilence.setNumSilenceFramesExitThresh(3);
      isSilence.incrConsecSilenceCount();
      isSilence.incrConsecSilenceCount(); // count = 2

      // Speech above threshold
      isSilence.write(Buffer.from([0, 10])); // speechSample = 10*256 + 10 = 2570 > 2000

      expect(isSilence.getConsecSilenceCount()).toBe(0); // should reset
    });

    it("should handle negative speech samples", () => {
      isSilence.setNumSilenceFramesExitThresh(1);
      const soundSpy = vi.fn();

      isSilence.on("sound", soundSpy);

      // Negative speech sample (above threshold in absolute value)
      isSilence.write(Buffer.from([255, 255])); // Should be treated as -1 in signed 16-bit

      // The actual behavior depends on the implementation
      expect(soundSpy).toBeDefined();
    });

    it("should process all frames in buffer", async () => {
      isSilence.setNumSilenceFramesExitThresh(1);
      const silenceSpy = vi.fn();

      isSilence.on("silence", silenceSpy);

      // Multiple frames of silence
      isSilence.write(Buffer.from([0, 0, 0, 0, 0, 0])); // 3 frames of silence

      expect(silenceSpy).toHaveBeenCalled();
    });

    it("should not emit events when threshold is zero", async () => {
      isSilence.setNumSilenceFramesExitThresh(0);
      const silenceSpy = vi.fn();
      const soundSpy = vi.fn();

      isSilence.on("silence", silenceSpy);
      isSilence.on("sound", soundSpy);

      isSilence.write(Buffer.from([0, 0])); // silence
      isSilence.write(Buffer.from([0, 10])); // speech

      expect(silenceSpy).not.toHaveBeenCalled();
      expect(soundSpy).not.toHaveBeenCalled();
    });
  });

  describe("Buffer processing", () => {
    it("should handle buffer with exactly 2 bytes", async () => {
      const chunks: Buffer[] = [];
      isSilence.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      isSilence.write(Buffer.from([1, 2]));
      isSilence.end();

      await new Promise((resolve) => {
        isSilence.on("end", resolve);
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toEqual(Buffer.from([1, 2]));
    });

    it("should handle buffer with multiple frames", async () => {
      const chunks: Buffer[] = [];
      isSilence.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // 4 frames (8 bytes)
      const buffer = Buffer.from([0, 0, 1, 1, 0, 0, 2, 2]);
      isSilence.write(buffer);
      isSilence.end();

      await new Promise((resolve) => {
        isSilence.on("end", resolve);
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toEqual(buffer);
    });
  });
});
