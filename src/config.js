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
    modelPath: 'models/blujay-9172db0114cd/',
    modelSha256: '9172db0114cd82a8759332975f2d97776b4f744a6d40a4ab62e959dd0df32667',
    runtimePath: 'runtime/onnx-1.30.0/',
  },
});
