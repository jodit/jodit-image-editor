# core/annotations

Pure, immutable list operations for annotations. They never mutate the input
array, so they slot straight into design patches and are tested without any
canvas or DOM.

```ts
import {
  createTextAnnotation,
  addAnnotation,
  updateAnnotation,
  removeAnnotation,
  findAnnotation,
} from '@jodit/image-editor';

let list = addAnnotation([], createTextAnnotation('t1', { text: 'Hello' }));
list = updateAnnotation(list, 't1', { bold: true, color: '#f00' });
findAnnotation(list, 't1'); // the patched annotation
list = removeAnnotation(list, 't1');
```

A `TextAnnotation` stores **normalised** coordinates (`x`,`y` in 0..1) and a
`fontSize` as a fraction of image height, so it is resolution-independent and
survives resize/crop. Rendering to pixels happens in
[`image/annotate`](../../image/README.md).
