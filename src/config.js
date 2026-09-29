// Branding and engine wiring live here; the board/controller only speak FEN + UCI.
export const config = Object.freeze({
  name: 'Blujay',
  subtitle: 'A homemade chess model',
  author: 'Alex Ashworth',
  portfolioUrl: 'https://clowdydev.com',
  sourceUrl: 'https://github.com/Clowdyffs/blujay-play',
  lichessUrl: 'https://lichess.org/@/Blujay-bot',
  engine: {
    adapter: 'action-value-onnx-v1',
    modelPath: 'models/blujay-7a937a0f7cf2/',
    modelSha256: '7a937a0f7cf2e0e762abaf82a1dbb983bee8f3ada2a6bf704f97844f2cbeb536',
    runtimePath: 'runtime/onnx-1.30.0/',
  },
});
