import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageEditor } from './editor';
import { ImageProcessor } from '../image/processor';
import type { ImageCodec } from '../image/codec';
import { SyncScheduler } from '../core/scheduler/scheduler';
import { solidRaster } from '../core/raster/raster';

/**
 * End-to-end *interface* tests: we drive the editor exactly as a user would —
 * dispatching real events onto the rendered nodes — and assert on **what got
 * rendered** (transforms, text, input values), never on `editor.state`.
 *
 * No browser, no Puppeteer. The architecture makes it cheap:
 *   - `SyncScheduler` → every update renders synchronously (our `act()`).
 *   - a fake `ImageProcessor` → no real canvas needed.
 *   - jsdom has no layout, so we feed the viewport size once (simulating the
 *     ResizeObserver) — that's environment setup, not the action under test.
 * This exercises the real production render path (`Renderer → DomHost`).
 */
const SIZE = 1000;

const fakeCodec: ImageCodec = {
  decode: vi.fn(async () => solidRaster(SIZE, SIZE, [128, 128, 128, 255])),
  encode: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
};

function makeProcessor(): ImageProcessor {
  return new ImageProcessor({
    codec: fakeCodec,
    createCanvas: () => {
      throw new Error('no canvas in flow tests');
    },
  });
}

async function mountWithImage(withViewport: boolean): Promise<ImageEditor> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const editor = new ImageEditor({
    container,
    processor: makeProcessor(),
    scheduler: new SyncScheduler(),
  });
  await editor.fromBlob(new Blob(['img'], { type: 'image/png' }));
  // jsdom has no layout → simulate the ResizeObserver giving us a square stage.
  if (withViewport) editor.update({ viewport: { width: SIZE, height: SIZE } });
  return editor;
}

// --- tiny "testing-library"-style helpers over the rendered DOM -------------
const $ = <T extends Element>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`not rendered: ${sel}`);
  return el;
};
const all = (sel: string): Element[] => [...document.querySelectorAll(sel)];
const byText = (sel: string, text: string): HTMLElement => {
  const el = all(sel).find((n) => n.textContent?.includes(text));
  if (!el) throw new Error(`no ${sel} containing "${text}"`);
  return el as HTMLElement;
};
// jsdom lacks PointerEvent; a MouseEvent carries clientX/clientY + the methods
// our handlers use, and dispatching it under a 'pointer*' type fires the
// listeners the renderer bound for that type.
const pointer = (node: EventTarget, type: string, x = 0, y = 0): void => {
  node.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  document.body.innerHTML = '';
});

describe('crop flow (interface-driven, asserting rendered output)', () => {
  it('dragging the SE handle shrinks the rendered dimensions readout', async () => {
    const editor = await mountWithImage(true);

    // dimensions readout starts at the full image
    expect($('.jie-topbar__meta span').textContent).toContain(`${SIZE} x ${SIZE} px`);

    // grab the bottom-right handle and drag it inward by 100 screen px on x
    const handle = $('.jie-crop__handle[data-h="se"]');
    pointer(handle, 'pointerdown', 900, 900);
    pointer(window, 'pointermove', 800, 900);
    pointer(window, 'pointerup', 800, 900);

    // scale = (1000 - 2*44padding) / 1000 = 0.912 → 100px ≈ 109.6 image px
    const text = $('.jie-topbar__meta span').textContent ?? '';
    expect(text).toBe('890 x 1000 px');
    editor.destroy();
  });

  it('the rotation knob tilts the rendered crop frame to follow the pointer', async () => {
    const editor = await mountWithImage(true);
    const frame = $<HTMLElement>('.jie-crop');
    expect(frame.style.transform).toBe('rotate(0deg)');

    // centre of the full-image crop maps to screen (500, 500). Grab the knob
    // (straight above centre) and drag the pointer to the right of centre → +90°.
    const knob = $('.jie-crop__rotate');
    pointer(knob, 'pointerdown', 500, 460);
    pointer(window, 'pointermove', 700, 500);
    pointer(window, 'pointerup', 700, 500);

    expect($<HTMLElement>('.jie-crop').style.transform).toBe('rotate(90deg)');
    editor.destroy();
  });
});

describe('text flow (interface-driven)', () => {
  it('open Text → Add text → edit the label, reflected in the rendered input', async () => {
    const editor = await mountWithImage(false); // no viewport → no canvas paint

    pointer(byText('.jie-tab', 'Text'), 'click');
    pointer(byText('.jie-btn', 'Add text'), 'click');

    const input = $<HTMLInputElement>('.jie-panel input.jie-input');
    expect(input.value).toBe('Text'); // the default label
    input.value = 'My Mark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect($<HTMLInputElement>('.jie-panel input.jie-input').value).toBe('My Mark');
    editor.destroy();
  });
});

describe('export reflects interface-driven edits', () => {
  it('produces a blob after a crop performed through the UI', async () => {
    const editor = await mountWithImage(true);
    const handle = $('.jie-crop__handle[data-h="se"]');
    pointer(handle, 'pointerdown', 900, 900);
    pointer(window, 'pointermove', 700, 700);
    pointer(window, 'pointerup', 700, 700);

    const blob = await editor.toBlob({ type: 'image/png' });
    expect(blob).toBeInstanceOf(Blob);
    expect(fakeCodec.encode).toHaveBeenCalledOnce();
    editor.destroy();
  });
});
