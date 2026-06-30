# core/filters

Pure colour work on a `RasterImage`, split in two:

- **`adjustments.ts`** — parametric finetune, neutral at 0: `brightness`,
  `contrast`, `saturation`, `warmth`, `blur` (separable box blur), plus
  `applyFinetune(img, state)`.
- **`filters.ts`** — named filters (`invert`, `grayscale`, `sepia`, `solarize`,
  `clarendon`, `gingham`) and an **open registry** so plugins add their own.

```ts
import { applyFilter, registerFilter, listFilters } from '@jodit/image-editor';

const unregister = registerFilter({
  id: 'duotone',
  label: 'Duotone',
  apply: (raster) => /* return a new RasterImage */ raster,
});

applyFilter(img, 'sepia'); // unknown ids fall back to "original"
listFilters(); // includes built-ins + any registered
unregister();
```

The Filters panel is built from `listFilters()`, so registered filters appear in
the UI automatically (Open/Closed principle).
