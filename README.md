# mic-ts

Forked from [mic](https://github.com/ashishbajaj99/mic) with the same interface, a stream simple wrapper of [sox](http://sox.sourceforge.net/).

## Installation

This module depends on your machine having an installation of [sox](http://sox.sourceforge.net/) for Mac/Win OR [arecord](http://alsa-project.org/) for Linux.

```sh
npm install mic-ts
```

## Quick Start

```javascript
import mic from 'mic-ts';

// Create microphone instance
const micInstance = mic({
  rate: '16000',
  channels: '1',
  debug: false,
});

// Get audio stream
const audioStream = micInstance.getAudioStream();

// Listen for audio data
audioStream.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes of audio data`);
});

// Start recording
micInstance.start();

// Stop recording after 5 seconds
setTimeout(() => {
  micInstance.stop();
}, 5000);
```

## Events

The audio stream emits several useful events:

```javascript
audioStream.on('startComplete', () => {
  console.log('Recording started');
});

audioStream.on('stopComplete', () => {
  console.log('Recording stopped');
});

audioStream.on('silence', () => {
  console.log('Silence detected');
});

audioStream.on('sound', () => {
  console.log('Sound detected');
});

audioStream.on('audioProcessExitComplete', () => {
  console.log('Audio process exited');
});

audioStream.on('error', (error) => {
  console.error('Error:', error);
});
```

## Silence Detection

```javascript
const micInstance = mic({
  exitOnSilence: 5, // Exit after 5 consecutive silent frames
});

const audioStream = micInstance.getAudioStream();

audioStream.on('silence', () => {
  console.log('Silence threshold reached');
  micInstance.stop(); // Auto-stop on silence
});
```

## Advanced Usage

```javascript
import { writeFileSync } from 'fs';

const micInstance = mic({
  rate: '44100',
  channels: '2',
  bitwidth: '16',
  encoding: 'signed-integer',
  endian: 'little',
  fileType: 'wav',
  debug: true,
});

const audioStream = micInstance.getAudioStream();
const audioChunks = [];

audioStream.on('data', (chunk) => {
  audioChunks.push(chunk);
});

audioStream.on('audioProcessExitComplete', () => {
  // Save recorded audio to file
  const audioData = Buffer.concat(audioChunks);
  writeFileSync('recording.wav', audioData);
  console.log('Audio saved to recording.wav');
});

micInstance.start();
```

## Examples

Check the `examples/` directory for complete usage examples:

```bash
# Run with tsx (TypeScript execution)
npx tsx examples/simple.ts

# Or run the compiled JavaScript version
node examples/simple.js
```

## System Dependencies

### macOS

```bash
brew install sox
```

### Linux

```bash
sudo apt-get install sox
# or
sudo apt-get install alsa-utils
```

### Windows

```bash
choco install sox.portable
```

## API Reference

### `mic(options)`

Creates a new microphone instance.

**Options:**
- `rate` (string): Sample rate (default: '16000')
- `channels` (string): Number of channels (default: '1')
- `bitwidth` (string): Bit width ('8', '16', or '24') (default: '16')
- `encoding` (string): Audio encoding (default: 'signed-integer')
- `endian` (string): Byte order ('little' or 'big') (default: 'little')
- `fileType` (string): Audio file type (default: 'raw')
- `debug` (boolean): Enable debug logging (default: false)
- `exitOnSilence` (number): Exit after N silent frames (default: 0)

### Methods

- `start()`: Start recording audio
- `stop()`: Stop recording audio
- `pause()`: Pause recording
- `resume()`: Resume recording
- `getAudioStream()`: Get the audio stream

## Acknowledgments

[mic](https://github.com/ashishbajaj99/mic) was created by [Ashish Bajaj](https://github.com/ashishbajaj99) bajaj.ashish@gmail.com, however missing typing for typescript and the repo is [inactive](https://github.com/ashishbajaj99/mic/pulls) for more then 5 years. This fork aims to preserver the existing interface without breaking changes and migrate the modern JS synctax as well as proper typing.
