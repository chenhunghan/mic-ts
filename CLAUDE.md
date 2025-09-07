# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mic-ts is a TypeScript-based Node.js library that provides a simple stream wrapper for audio recording. It's a modernized fork of the original `mic` package with TypeScript support and backward compatibility. The library wraps external audio recording tools (`sox` for macOS/Windows, `arecord` for Linux) and provides a unified JavaScript/TypeScript interface for microphone audio input.

## Development Commands

### Building and Testing

- `npm run build` - Clean and compile TypeScript to JavaScript
- `npm test` - Run comprehensive test suite (types, lint, format, unit)
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:types` - TypeScript type checking
- `npm run test:lint` - Run ESLint
- `npm run test:format` - Run Prettier
- `npm run e2e` - Run end-to-end audio recording test

### Code Quality

- Uses ESLint + TypeScript ESLint for linting
- Uses Prettier for code formatting
- Strict TypeScript configuration enabled

## Architecture

### Core Components

- **src/index.ts** - Main entry point, exports factory function
- **src/Mic.ts** - Core implementation with abstract Mic class and MicImpl
- **src/MicOptions.ts** - TypeScript interface for configuration options
- **src/IsSilence.ts** - Transform stream for silence detection

### Key Design Patterns

- Abstract class pattern with `Mic` interface and `MicImpl` implementation
- Stream-based architecture using Node.js Transform streams
- Event-driven API with custom events (`silence`, `sound`, `startComplete`, etc.)
- Factory function for creating instances

## Prerequisites

### System Dependencies

- **macOS/Windows**: `sox` must be installed
- **Linux**: `arecord` (via ALSA) must be installed

### Installation Commands

- Linux: `sudo apt-get install sox`
- macOS: `brew install sox`
- Windows: `choco install sox.portable`

## Important Notes

- The project uses ES modules (`"type": "module"` in package.json)
- TypeScript target is ES2022 with strict settings
- Backward compatibility with original mic package API is maintained
- The library returns a Passthrough stream object supporting standard stream operations
- Debug mode is available for troubleshooting audio recording issues
