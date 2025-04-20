import fs from "fs";
import mic from "./index.js";

const micInstance = mic({
  rate: "16000",
  channels: "1",
  debug: false,
  exitOnSilence: 6,
});
const micInputStream = micInstance.getAudioStream();

const outputFileStream = fs.createWriteStream("output.raw");

micInputStream.pipe(outputFileStream);

let chunkCounter = 0;
micInputStream.on("data", function (data: Buffer) {
  console.log(
    "Received Input Stream of Size %d: %d",
    data.length,
    chunkCounter++,
  );
});

micInputStream.on("error", function (error) {
  console.log("Error in Input Stream: " + error);
});

micInputStream.on("startComplete", function () {
  console.log("Got SIGNAL startComplete");
  setTimeout(function () {
    micInstance.pause();
  }, 5000);
});

micInputStream.on("stopComplete", function () {
  console.log("Got SIGNAL stopComplete");
});

micInputStream.on("pauseComplete", function () {
  console.log("Got SIGNAL pauseComplete");
  setTimeout(function () {
    micInstance.resume();
  }, 5000);
});

micInputStream.on("resumeComplete", function () {
  console.log("Got SIGNAL resumeComplete");
  setTimeout(function () {
    micInstance.stop();
  }, 5000);
});

micInputStream.on("silence", function () {
  console.log("Got SIGNAL silence");
});

micInputStream.on("processExitComplete", function () {
  console.log("Got SIGNAL processExitComplete");
});

micInstance.start();
