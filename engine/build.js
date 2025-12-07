import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: '../editor/external/engine.js',
  format: 'esm',
  target: 'es2020',
  minify: !isWatch,
  sourcemap: true,
  platform: 'browser',
  external: ['three', 'three/webgpu', 'three/examples/jsm/controls/OrbitControls.js'],
  logLevel: 'info',
};

if (isWatch) {
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  
  // Generate TypeScript declaration files
  const { execSync } = await import('child_process');
  execSync('npx tsc', { stdio: 'inherit' });
  
  console.log('Build complete!');
}

