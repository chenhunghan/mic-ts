export interface MicOptions {
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
   * @defaultValue `16000`
   */
  rate?: string;
  /**
   * Number of channels of audio data; e.g. 2 = stereo
   * @defaultValue `1`
   */
  channels?: string;
  /**
   * arecord device
   * @defaultValue `plughw:1,0`
   */
  device?: string;
  /**
   * signal is raised after reaching these many consecutive frames
   * @defaultValue `0`
   */
  exitOnSilence?: number;
  /**
   * File type of audio, one of 8svx aif aifc aiff aiffc al amb au avr caf cdda cdr cvs cvsd cvu dat dvms f32 f4 f64 f8 fap flac fssd gsm gsrt hcom htk ima ircam la lpc lpc10 lu mat mat4 mat5 maud mp2 mp3 nist ogg opus paf prc pvf raw s1 s16 s2 s24 s3 s32 s4 s8 sb sd2 sds sf sl sln smp snd sndfile sndr sndt sou sox sph sw txw u1 u16 u2 u24 u3 u32 u4 u8 ub ul uw vms voc vorbis vox w64 wav wavpcm wve xa xi
   * @defaultValue `raw`
   */
  fileType?: string;
  /**
   * Print debug info
   * @defaultValue `false`
   */
  debug?: boolean;
}
