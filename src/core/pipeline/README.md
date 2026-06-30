# core/pipeline

The pure rendering pipeline: **`execute(raster, design) => raster`**. It composes
the individual operations in a fixed order so the same design always yields the
same pixels — the property the test suite leans on.

Order: flip → rotate → crop → resize → finetune → filter.

```ts
import { execute, isIdentity, createIdentityDesign } from '@jodit/image-editor';

const out = execute(sourceRaster, { ...createIdentityDesign(), rotate: 90, filter: 'sepia' });
isIdentity(createIdentityDesign()); // true — lets callers skip a no-op export
```

Text/vector **annotations are not handled here** — they need a text-shaping
engine (canvas) and are composited by the [`image`](../../image/README.md)
adapter on top of this pipeline's output, keeping the pipeline 100% pure.
