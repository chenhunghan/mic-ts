import { spawn, type SpawnOptions } from "child_process";
import { type } from "os";
import { PassThrough } from "stream";
import IsSilence from "./IsSilence.js";

interface MicOptions {
  /**
   * Encoded byte-order "little" or "big";
   * @default little
   */
  endian?: "little" | "big";
  /**
   * Encoded sample size in 8/16/24 bits.
   * @default 16
   */
  bitwidth?: "8" | "16" | "24";
  /**
   * Set encoding, may be one of signed-integer, unsigned-integer
   * @default signed-integer
   */
  encoding?: "signed-integer" | "unsigned-integer";
  /**
   * Sample rate of audio
   * @default 16000
   */
  rate?: string;
  /**
   * Number of channels of audio data; e.g. 2 = stereo
   * @default 1
   */
  channels?: string;
  /**
   * arecord device
   * @default plughw:1,0
   */
  device?: string;
  /**
   * signal is raised after reaching these many consecutive frames
   * @default: 0
   */
  exitOnSilence?: number;
  /**
   * File type of audio, one of 8svx aif aifc aiff aiffc al amb au avr caf cdda cdr cvs cvsd cvu dat dvms f32 f4 f64 f8 fap flac fssd gsm gsrt hcom htk ima ircam la lpc lpc10 lu mat mat4 mat5 maud mp2 mp3 nist ogg opus paf prc pvf raw s1 s16 s2 s24 s3 s32 s4 s8 sb sd2 sds sf sl sln smp snd sndfile sndr sndt sou sox sph sw txw u1 u16 u2 u24 u3 u32 u4 u8 ub ul uw vms voc vorbis vox w64 wav wavpcm wve xa xi
   * @default raw
   */
  fileType?: string;
  /**
   * Print debug info
   */
  debug?: boolean;
}

abstract class Mic {
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

class MicImpl implements Mic {
  private audioProcess: ReturnType<typeof spawn> | null = null;
  private infoStream = new PassThrough();
  private audioStream: IsSilence;
  private debug: boolean;
  private arecordEncoding: "U" | "S";
  private arecordEndian: "BE" | "LE";
  private bitwidth: "8" | "16" | "24";
  private arecordFormat: `${typeof this.arecordEncoding}${typeof this.bitwidth}_${typeof this.arecordEndian}`;
  private endian: "little" | "big";
  private channels: string;
  private rate: string;
  private encoding: string;
  private fileType: string;
  private device: string;

  constructor(options: MicOptions = {}) {
    this.debug = options.debug || false;
    this.audioStream = new IsSilence({ debug: this.debug });
    const exitOnSilence = options.exitOnSilence || 0;
    this.audioStream.setNumSilenceFramesExitThresh(
      parseInt(`${exitOnSilence}`, 10),
    );

    this.endian = options.endian || "little";
    this.arecordEndian = this.endian === "big" ? "BE" : "LE";
    this.encoding = options.encoding || "signed-integer";
    this.arecordEncoding = this.encoding === "unsigned-integer" ? "U" : "S";
    this.bitwidth = options.bitwidth || "16";
    this.arecordFormat = `${this.arecordEncoding}${this.bitwidth}_${this.arecordEndian}`;
    this.channels = options.channels || "1";
    this.rate = options.rate || "16000";
    this.fileType = options.fileType || "raw";
    this.device = options.device || "plughw:1,0";

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
      if (type() === "Windows_NT") {
        this.audioProcess = spawn(
          "sox",
          [
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
            "waveaudio",
            "default",
            "-p",
          ],
          this.getAudioProcessOptions(),
        );
      } else if (type() === "Darwin") {
        this.audioProcess = spawn(
          "rec",
          [
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
          ],
          this.getAudioProcessOptions(),
        );
      } else {
        this.audioProcess = spawn(
          "arecord",
          [
            "-t",
            this.fileType,
            "-c",
            this.channels,
            "-r",
            this.rate,
            "-f",
            this.arecordFormat,
            "-D",
            this.device,
          ],
          this.getAudioProcessOptions(),
        );
      }

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
      this.audioProcess.kill("SIGSTOP");
      this.audioStream.pause();
      this.audioStream.emit("pauseComplete");
      if (this.debug) {
        console.log("Microphone paused");
      }
    }
  }

  public resume() {
    if (this.audioProcess != null) {
      this.audioProcess.kill("SIGCONT");
      this.audioStream.resume();
      this.audioStream.emit("resumeComplete");
      if (this.debug) {
        console.log("Microphone resumed");
      }
    }
  }

  public getAudioStream() {
    return this.audioStream;
  }
}

const mic = function mic(options: MicOptions = {}): Mic {
  return new MicImpl(options);
};

export default mic;
