# VASE Engine

A Three.js WebGPU engine library that displays a rotating 1x1x1 cube with orbital camera controls.

## Features

- WebGPU-based rendering using Three.js
- Orbital camera controls for interactive viewing
- Automatic window resize handling
- Clean resource management with cleanup function

## Building

```bash
npm install
npm run build
```

The bundled library will be output to `dist/engine.js`.

## Usage

```typescript
import { initRenderer } from './engine.js';

const canvas = document.querySelector('canvas');
const { cleanup } = await initRenderer(canvas);

// When done, clean up resources
cleanup();
```

## Development

Watch mode for development:

```bash
npm run watch
```

