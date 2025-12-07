# VASE - Virtual Architecture Sandbox Environment

A modern web-based editor with a Three.js WebGPU engine.

## Project Structure

```
VASE/
├── editor/          # VASE Editor - Svelte 5 application
│   ├── src/
│   │   ├── routes/
│   │   │   └── +page.svelte    # Main page with canvas
│   │   └── app.html             # HTML template
│   └── package.json
└── engine/          # VASE Engine - Three.js WebGPU engine library
    ├── src/
    │   └── index.ts             # Engine implementation
    ├── dist/
    │   ├── engine.js            # Bundled library
    │   └── engine.d.ts          # TypeScript declarations
    ├── build.js                 # esbuild configuration
    └── package.json
```

## Getting Started

### 1. Install Dependencies

First, install dependencies for the VASE Engine:

```bash
cd engine
npm install
cd ..
```

Then install dependencies for the VASE Editor:

```bash
cd editor
npm install
```

### 2. Run the Development Server

The VASE Editor automatically builds the VASE Engine before starting:

```bash
cd editor
npm run dev
```

This will:
1. Build the VASE Engine library (via `predev` hook)
2. Start the Svelte development server
3. Open the application in your browser

You should see a rotating 1x1x1 cube in the center of the screen with orbital camera controls.

## Features

### VASE Engine

- **WebGPU Rendering**: Uses Three.js WebGPU engine for modern graphics
- **Orbital Controls**: Interactive camera controls (click and drag to orbit)
- **Auto-resize**: Automatically handles window resizing
- **Clean Architecture**: Bundled with esbuild for optimal performance

### VASE Editor

- **Svelte 5**: Built with the latest Svelte framework
- **Full-screen Canvas**: Canvas fills the entire window
- **Responsive**: Adapts to window size changes
- **Type-safe**: Full TypeScript support

## Development

### Building the VASE Engine

```bash
cd engine
npm run build        # Build once
npm run watch        # Build and watch for changes
```

### Building the VASE Editor

```bash
cd editor
npm run build        # Production build
npm run preview      # Preview production build
```

## Browser Requirements

WebGPU is required to run this application. Supported browsers:
- Chrome 113+
- Edge 113+
- Safari 18+ (macOS Sonoma or later)
- Firefox (with `dom.webgpu.enabled` flag)

## Controls

- **Left Mouse Button**: Rotate camera around the cube
- **Right Mouse Button**: Pan camera
- **Mouse Wheel**: Zoom in/out

