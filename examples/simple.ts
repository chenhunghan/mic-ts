#!/usr/bin/env node

import { writeFileSync } from 'fs';
import mic from '../src/index.js';

// Simple example: Record 3 seconds of audio and save to file
async function simpleExample() {
  console.log('🎙️  Starting simple audio recording example...');
  
  // Create microphone instance with basic configuration
  const micInstance = mic({
    rate: '16000',
    channels: '1',
    bitwidth: '16',
    encoding: 'signed-integer',
    fileType: 'raw',
    debug: false,
  });

  const audioStream = micInstance.getAudioStream();
  const audioChunks: Buffer[] = [];

  // Collect audio data
  audioStream.on('data', (chunk: Buffer) => {
    audioChunks.push(chunk);
    console.log(`📊 Received audio chunk: ${chunk.length} bytes`);
  });

  // Handle silence detection
  audioStream.on('silence', () => {
    console.log('🤫 Silence detected');
  });

  audioStream.on('sound', () => {
    console.log('🔊 Sound detected');
  });

  // Handle recording completion
  audioStream.on('audioProcessExitComplete', () => {
    console.log('✅ Recording completed');
    
    // Combine all audio chunks and save to file
    const audioData = Buffer.concat(audioChunks);
    writeFileSync('recording.raw', audioData);
    console.log(`💾 Audio saved to recording.raw (${audioData.length} bytes)`);
    
    console.log('\n🎉 Example completed successfully!');
    console.log('💡 Tip: You can play the raw audio file with:');
    console.log('   sox -r 16000 -e signed -b 16 -c 1 recording.raw recording.wav');
  });

  // Handle errors
  audioStream.on('error', (error: Error) => {
    console.error('❌ Audio stream error:', error.message);
  });

  // Start recording
  console.log('🔴 Recording started... (will stop after 3 seconds)');
  micInstance.start();

  // Stop recording after 3 seconds
  setTimeout(() => {
    console.log('⏹️  Stopping recording...');
    micInstance.stop();
  }, 3000);
}

// Run the example
simpleExample().catch(console.error);