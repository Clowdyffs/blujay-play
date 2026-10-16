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
    modelPath: 'models/blujay-4f369b226272/',
    modelSha256: '4f369b2262727c24b0aad9ea5c89cb7f06f4c3ddfa2f5ba9fc68a6cc780da54a',
    runtimePath: 'runtime/onnx-1.30.0/',
  },
});
