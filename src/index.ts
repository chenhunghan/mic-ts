import { type Mic, MicImpl } from "./Mic.js";
import type { MicOptions } from "./MicOptions.js";

const mic = function mic(options: MicOptions = {}): Mic {
  return new MicImpl(options);
};

export default mic;
export { MicImpl };
export type { Mic };
