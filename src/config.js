// Branding and engine wiring live here; the board/controller only speak FEN + UCI.
export const config = Object.freeze({
  name: 'Blujay',
  tagline: 'A neural network that plays chess, running entirely in your browser.',
  author: 'Alex Ashworth',
  portfolioUrl: 'https://clowdy.dev',
  sourceUrl: 'https://github.com/Clowdyffs/blujay-play',
  lichessUrl: 'https://lichess.org/@/Blujay-bot',
  engine: {
    adapter: 'action-value-onnx-v1',
    modelPath: 'models/blujay-477e2901ed1b/',
    modelSha256: '477e2901ed1b2b01295e981514bbbc9f2924be2e4725918a037a0abe5c9160aa',
    runtimePath: 'runtime/onnx-1.30.0/',
  },
});
