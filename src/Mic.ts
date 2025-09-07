import { spawn, type SpawnOptions } from "child_process";
import { PassThrough } from "stream";
import { IsSilence } from "./IsSilence.js";
import type { MicOptions } from "./MicOptions.js";

export abstract class Mic {
  /**
   * This instantiates the process arecord OR sox using the options specified
   */
  abstract start(): void;
  /**
   * This kills the arecord OR sox process that was started in the start() routine. It uses the SIGTERM signal.
   */
  abstract stop(): void;
  /**
   * This pauses the arecord OR sox process using the SIGSTOP signal.
   */
  abstract pause(): void;
  /**
   * This resumes the arecord OR sox process using the SIGCONT signal.
   */
  abstract resume(): void;
  /**
   * This returns a simple Transform stream that contains the data from the arecord OR sox process. This sream can be directly piped to a speaker sream OR a file stream. Further this provides a number of events triggered by the state of the stream:
   * - `silence`: This is emitted once when exitOnSilence number of consecutive frames of silence are found.
   * - `sound`: This is emitted if we hear something after a silence.
   * - `processExitComplete`: This is emitted once the arecord OR sox process exits.
   * - `startComplete`: This is emitted once the `start()` function is successfully executed.
   * - `stopComplete`: This is emitted once the `stop()` function is successfully executed.
   * - `pauseComplete`: This is emitted once the `pause()` function is successfully executed.
   * - `resumeComplete`: This is emitted once the `resume()` function is successfully executed.
   * - It further inherits all the Events from `Transform`.
   */
  abstract getAudioStream(): PassThrough;
}

export class MicImpl implements Mic {
  private audioProcess: ReturnType<typeof spawn> | null = null;
  private infoStream = new PassThrough();
  private audioStream: IsSilence;
  private debug: boolean;
  private bitwidth: "8" | "16" | "24";
  private endian: "little" | "big";
  private channels: string;
  private rate: string;
  private encoding: string;
  private fileType: string;

  constructor(options: MicOptions = {}) {
    this.debug = options.debug || false;
    this.audioStream = new IsSilence({ debug: this.debug });
    const exitOnSilence = options.exitOnSilence || 0;
    this.audioStream.setNumSilenceFramesExitThresh(
      parseInt(`${exitOnSilence}`, 10),
    );

    this.endian = options.endian || "little";
    this.encoding = options.encoding || "signed-integer";
    this.bitwidth = options.bitwidth || "16";
    this.channels = options.channels || "1";
    this.rate = options.rate || "16000";
    this.fileType = options.fileType || "raw";

    if (this.debug) {
      this.infoStream.on("data", function (data) {
        console.log("Received Info: " + data);
      });
      this.infoStream.on("error", function (error) {
        console.log("Error in Info Stream: " + error);
      });
    }
  }

  private getAudioProcessOptions(): SpawnOptions {
    if (this.debug) {
      return {
        stdio: ["ignore", "pipe", "pipe"],
      };
    }

    return {
      stdio: ["ignore", "pipe", "ignore"],
    };
  }

  public start() {
    if (this.audioProcess === null) {
      const command = "rec";
      const args = [
        "-b",
        this.bitwidth,
        "--endian",
        this.endian,
        "-c",
        this.channels,
        "-r",
        this.rate,
        "-e",
        this.encoding,
        "-t",
        this.fileType,
        "-",
      ];
      this.audioProcess = spawn(command, args, this.getAudioProcessOptions());
      this.audioProcess.on("error", (err: NodeJS.ErrnoException) => {
        let message = `Error starting audio process "${command}": ${err.message}`;
        if (err.code === "ENOENT") {
          message = `Audio command "${command}" not found. Please install it and ensure it's in your PATH.`;
        }
        const errorObj = new Error(message);
        if (this.audioStream.listenerCount("error") > 0) {
          this.audioStream.emit("error", errorObj);
        } else {
          console.error(message);
        }
      });

      this.audioProcess.on(
        "exit",
        (code: number | null, sig: string | null) => {
          if (code != null && sig === null) {
            this.audioStream.emit("audioProcessExitComplete");
            if (this.debug)
              console.log(
                "recording audioProcess has exited with code = %d",
                code,
              );
          }
        },
      );
      if (this.audioProcess.stdout) {
        this.audioProcess.stdout.pipe(this.audioStream);
      }
      if (this.debug && this.audioProcess.stderr) {
        this.audioProcess.stderr.pipe(this.infoStream);
      }
      this.audioStream.emit("startComplete");
    } else {
      if (this.debug) {
        throw new Error(
          "Duplicate calls to start(): Microphone already started!",
        );
      }
    }
  }

  public stop() {
    if (this.audioProcess != null) {
      this.audioProcess.kill("SIGTERM");
      this.audioProcess = null;
      this.audioStream.emit("stopComplete");
      if (this.debug) {
        console.log("Microphone stopped");
      }
    }
  }

  public pause() {
    if (this.audioProcess != null) {
      try {
        // SIGSTOP is not available on Windows, but we can still pause the stream
        if (process.platform !== "win32") {
          this.audioProcess.kill("SIGSTOP");
        }
        this.audioStream.pause();
        this.audioStream.emit("pauseComplete");
        if (this.debug) {
          console.log("Microphone paused");
        }
      } catch (error) {
        // On Windows, SIGSTOP is not available, but we still want to pause the stream
        if (
          process.platform === "win32" &&
          error instanceof Error &&
          error.message.includes("SIGSTOP")
        ) {
          this.audioStream.pause();
          this.audioStream.emit("pauseComplete");
          if (this.debug) {
            console.log("Microphone paused (stream level on Windows)");
          }
        } else {
          throw error;
        }
      }
    }
  }

  public resume() {
    if (this.audioProcess != null) {
      try {
        // SIGCONT is not available on Windows, but we can still resume the stream
        if (process.platform !== "win32") {
          this.audioProcess.kill("SIGCONT");
        }
        this.audioStream.resume();
        this.audioStream.emit("resumeComplete");
        if (this.debug) {
          console.log("Microphone resumed");
        }
      } catch (error) {
        // On Windows, SIGCONT is not available, but we still want to resume the stream
        if (
          process.platform === "win32" &&
          error instanceof Error &&
          error.message.includes("SIGCONT")
        ) {
          this.audioStream.resume();
          this.audioStream.emit("resumeComplete");
          if (this.debug) {
            console.log("Microphone resumed (stream level on Windows)");
          }
        } else {
          throw error;
        }
      }
    }
  }

  public getAudioStream() {
    return this.audioStream;
  }
}
