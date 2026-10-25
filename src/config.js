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
    modelPath: 'models/blujay-0afe1e116d5d/',
    modelSha256: '0afe1e116d5dc965e203f133c429683773e1a19c8cd8a7329417e57a646c306b',
    runtimePath: 'runtime/onnx-1.30.0/',
  },
});
