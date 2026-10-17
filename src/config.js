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
    modelPath: 'models/blujay-8cdc384e14db/',
    modelSha256: '8cdc384e14db7da19f35c165c92ad8d34c55974882abcf811d9e77fa3dff2169',
    runtimePath: 'runtime/onnx-1.30.0/',
  },
});
