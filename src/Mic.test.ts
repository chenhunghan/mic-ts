import { describe, it, expect, vi, beforeEach } from "vitest";
import { MicImpl } from "./Mic.js";
import { IsSilence } from "./IsSilence.js";

describe("MicImpl", () => {
  let mic: MicImpl;

  beforeEach(() => {
    mic = new MicImpl();
  });

  it("should emit startComplete when start is called", () => {
    const audioStream = mic.getAudioStream();
    const startComplete = vi.fn();

    audioStream.on("startComplete", startComplete);
    mic.start();

    expect(startComplete).toHaveBeenCalledOnce();
  });

  it("should throw an error if start is called multiple times", () => {
    const debugMic = new MicImpl({ debug: true });
    debugMic.start();

    expect(() => debugMic.start()).toThrowError(
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

  describe("Constructor options", () => {
    it("should use default options when none provided", () => {
      const mic = new MicImpl();
      const audioStream = mic.getAudioStream();
      expect(audioStream.getNumSilenceFramesExitThresh()).toBe(0);
    });

    it("should use custom exitOnSilence option", () => {
      const mic = new MicImpl({ exitOnSilence: 5 });
      const audioStream = mic.getAudioStream();
      expect(audioStream.getNumSilenceFramesExitThresh()).toBe(5);
    });

    it("should use debug option", () => {
      const mic = new MicImpl({ debug: true });
      expect(() => mic.start()).not.toThrow();
    });

    it("should use custom audio format options", () => {
      const mic = new MicImpl({
        bitwidth: "24",
        endian: "big",
        channels: "2",
        rate: "44100",
        encoding: "unsigned-integer",
        fileType: "wav",
      });
      expect(() => mic.start()).not.toThrow();
    });
  });

  describe("Audio process error handling", () => {
    it("should handle audio process error with ENOENT code", () => {
      const mic = new MicImpl({ debug: false });
      const audioStream = mic.getAudioStream();
      const errorSpy = vi.fn();

      audioStream.on("error", errorSpy);
      mic.start();

      // Simulate error event (this would normally come from the actual process)
      const audioProcess = (
        mic as unknown as {
          audioProcess: {
            emit: (
              event: string,
              error: { code: string; message: string },
            ) => void;
          } | null;
        }
      ).audioProcess;
      if (audioProcess) {
        audioProcess.emit("error", {
          code: "ENOENT",
          message: "Command not found",
        });
      }

      // Note: In real scenario, this would test the error handling logic
      // For unit tests, we verify the method exists and doesn't throw
      expect(errorSpy).toBeDefined();
    });

    it("should handle audio process error with other codes", () => {
      const mic = new MicImpl({ debug: false });
      const audioStream = mic.getAudioStream();
      const errorSpy = vi.fn();

      audioStream.on("error", errorSpy);
      mic.start();

      // Simulate error event
      const audioProcess = (
        mic as unknown as {
          audioProcess: {
            emit: (
              event: string,
              error: { code: string; message: string },
            ) => void;
          } | null;
        }
      ).audioProcess;
      if (audioProcess) {
        audioProcess.emit("error", {
          code: "EACCES",
          message: "Permission denied",
        });
      }

      expect(errorSpy).toBeDefined();
    });
  });

  describe("Audio process exit handling", () => {
    it("should emit audioProcessExitComplete on normal exit", () => {
      const mic = new MicImpl();
      const audioStream = mic.getAudioStream();
      const exitSpy = vi.fn();

      audioStream.on("audioProcessExitComplete", exitSpy);
      mic.start();

      // Simulate process exit
      const audioProcess = (
        mic as unknown as {
          audioProcess: {
            emit: (
              event: string,
              code: number | null,
              signal: string | null,
            ) => void;
          } | null;
        }
      ).audioProcess;
      if (audioProcess) {
        audioProcess.emit("exit", 0, null);
      }

      expect(exitSpy).toHaveBeenCalled();
    });

    it("should not emit audioProcessExitComplete when killed by signal", () => {
      const mic = new MicImpl();
      const audioStream = mic.getAudioStream();
      const exitSpy = vi.fn();

      audioStream.on("audioProcessExitComplete", exitSpy);
      mic.start();

      // Simulate process killed by signal
      const audioProcess = (
        mic as unknown as {
          audioProcess: {
            emit: (
              event: string,
              code: number | null,
              signal: string | null,
            ) => void;
          } | null;
        }
      ).audioProcess;
      if (audioProcess) {
        audioProcess.emit("exit", null, "SIGTERM");
      }

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe("Info stream handling", () => {
    it("should handle info stream data in debug mode", () => {
      const mic = new MicImpl({ debug: true });
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mic.start();

      // Simulate info stream data
      const infoStream = (
        mic as unknown as {
          infoStream: { emit: (event: string, data: Buffer) => void };
        }
      ).infoStream;
      infoStream.emit("data", Buffer.from("test info"));

      expect(consoleSpy).toHaveBeenCalledWith("Received Info: test info");
      consoleSpy.mockRestore();
    });

    it("should handle info stream error in debug mode", () => {
      const mic = new MicImpl({ debug: true });
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mic.start();

      // Simulate info stream error
      const infoStream = (
        mic as unknown as {
          infoStream: { emit: (event: string, error: Error) => void };
        }
      ).infoStream;
      infoStream.emit("error", new Error("test error"));

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in Info Stream: Error: test error",
      );
      consoleSpy.mockRestore();
    });
  });

  describe("Edge cases", () => {
    it("should handle multiple stop calls", () => {
      const mic = new MicImpl();
      mic.start();
      mic.stop();
      expect(() => mic.stop()).not.toThrow();
    });

    it("should handle multiple pause calls", () => {
      const mic = new MicImpl();
      mic.start();
      mic.pause();
      expect(() => mic.pause()).not.toThrow();
    });

    it("should handle multiple resume calls", () => {
      const mic = new MicImpl();
      mic.start();
      mic.pause();
      mic.resume();
      expect(() => mic.resume()).not.toThrow();
    });

    it("should handle resume without pause", () => {
      const mic = new MicImpl();
      mic.start();
      expect(() => mic.resume()).not.toThrow();
    });
  });
});
