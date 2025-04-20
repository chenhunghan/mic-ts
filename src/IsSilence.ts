import { Transform, type TransformCallback } from "stream";

class IsSilence extends Transform {
  private debug: boolean;
  private consecSilenceCount: number;
  private numSilenceFramesExitThresh: number;

  constructor(options: { debug: boolean }) {
    super();
    this.debug = options.debug || false;
    this.consecSilenceCount = 0;
    this.numSilenceFramesExitThresh = 0;
  }

  getNumSilenceFramesExitThresh() {
    return this.numSilenceFramesExitThresh;
  }

  getConsecSilenceCount() {
    return this.consecSilenceCount;
  }

  setNumSilenceFramesExitThresh(numFrames: number) {
    this.numSilenceFramesExitThresh = numFrames;
  }

  incrConsecSilenceCount(): number {
    this.consecSilenceCount++;
    return this.consecSilenceCount;
  }

  resetConsecSilenceCount() {
    this.consecSilenceCount = 0;
  }

  override _transform(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunk: any,
    _: BufferEncoding,
    callback: TransformCallback,
  ) {
    let silenceLength = 0;
    const consecutiveSilence = this.getConsecSilenceCount();
    const numSilenceFramesExitThresh = this.getNumSilenceFramesExitThresh();

    if (numSilenceFramesExitThresh) {
      for (let i = 0; i < chunk.length; i += 2) {
        let speechSample;
        if (chunk[i + 1] > 128) {
          speechSample = (chunk[i + 1] - 256) * 256;
        } else {
          speechSample = chunk[i + 1] * 256;
        }
        speechSample += chunk[i];

        if (Math.abs(speechSample) > 2000) {
          if (this.debug) {
            console.log("Found speech block");
          }
          if (consecutiveSilence > numSilenceFramesExitThresh) {
            this.emit("sound");
          }
          this.resetConsecSilenceCount();
          break;
        } else {
          silenceLength++;
        }
      }

      if (silenceLength === chunk.length / 2) {
        const newConsecutiveSilence = this.incrConsecSilenceCount();
        if (this.debug) {
          console.log(
            "Found silence block: %d of %d",
            newConsecutiveSilence,
            numSilenceFramesExitThresh,
          );
        }
        if (newConsecutiveSilence === numSilenceFramesExitThresh) {
          this.emit("silence");
        }
      }
    }

    this.push(chunk);
    callback();
  }
}

export default IsSilence;
