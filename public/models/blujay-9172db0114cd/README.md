# Blujay browser model

© 2026 Alex Ashworth. ONNX weights, encoding, and manifest in this directory are licensed under CC BY 4.0. See `../../../licenses/CC-BY-4.0.txt` in the source repository.

Attribution: Blujay model by Alex Ashworth (https://clowdydev.com).

3,713,072 parameters, move-set architecture (v4) with a learned square-pair attention bias, epoch 9 with averaged weights of a 12-epoch run trained with mate-distance labels and a per-move repetition input computed from the game history, float32. SHA-256 and tensor contract are in `manifest.json`. The model returns expected win-percentage scores for the side to move; those are not centipawn scores or a calibrated Elo estimate. Playing strength has not been established by this demo.

The training source, checkpoint, and training data are not part of this distribution. Do not overwrite this immutable model path with different weights. New weights require a new path and configured SHA.
