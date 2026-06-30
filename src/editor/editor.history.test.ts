import { afterEach, describe, expect, it } from 'vitest';
import { ImageEditor } from './editor';
import { ImageProcessor } from '../image/processor';
import type { ImageCodec } from '../image/codec';
import { SyncScheduler } from '../core/scheduler/scheduler';
import { solidRaster } from '../core/raster/raster';

/**
 * History (undo/redo) exercised *through the interface*: we click the toolbar's
 * Undo/Redo and other controls, and assert on the rendered output. The pure
 * timeline maths live in `core/state/history.test.ts`; here we verify the
 * end-to-end behaviour a user actually sees.
 */
interface MountOptions {
  width?: number;
  height?: number;
  viewport?: boolean;
  confirm?: () => boolean;
}

async function mount(opts: MountOptions = {}): Promise<ImageEditor> {
  const { width = 1200, height = 800, viewport, confirm } = opts;
  const codec: ImageCodec = {
    decode: async () => solidRaster(width, height, [128, 128, 128, 255]),
    encode: async () => new Blob(['x'], { type: 'image/png' }),
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const editor = new ImageEditor({
    container,
    processor: new ImageProcessor({
      codec,
      createCanvas: () => {
        throw new Error('no canvas');
      },
    }),
    scheduler: new SyncScheduler(),
    ...(confirm ? { confirm } : {}),
  });
  await editor.fromBlob(new Blob(['img'], { type: 'image/png' }));
  if (viewport) editor.update({ viewport: { width: 1000, height: 1000 } });
  return editor;
}

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
const byTitle = (sel: string, title: string): HTMLButtonElement => {
  const el = all(sel).find((n) => n.getAttribute('title') === title);
  if (!el) throw new Error(`no ${sel} titled "${title}"`);
  return el as HTMLButtonElement;
};
const click = (node: EventTarget): void =>
  void node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const pointer = (node: EventTarget, type: string): void =>
  void node.dispatchEvent(new MouseEvent(type, { bubbles: true }));
const setValue = (input: HTMLInputElement, value: string, event: 'input' | 'change'): void => {
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
};
const dims = (): string => $('.jie-topbar__meta span').textContent ?? '';
const undo = () => byTitle('.jie-btn', 'Undo');
const redo = () => byTitle('.jie-btn', 'Redo');
const widthInput = () => (all('.jie-fieldrow input.jie-input') as HTMLInputElement[])[0]!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('history: toolbar affordances', () => {
  it('a freshly loaded image has nothing to undo or redo', async () => {
    const editor = await mount();
    expect(undo().disabled).toBe(true);
    expect(redo().disabled).toBe(true);
    editor.destroy();
  });

  it('ephemeral actions (tab switches, zoom) never touch history', async () => {
    const editor = await mount();
    click(byText('.jie-tab', 'Finetune'));
    click(byText('.jie-tab', 'Filters'));
    click(byText('.jie-tab', 'Resize'));
    click(byTitle('.jie-btn', 'Zoom in'));
    click(byTitle('.jie-btn', 'Zoom out'));
    expect(undo().disabled).toBe(true); // still a clean history
    editor.destroy();
  });

  it('Undo enables after an edit and Redo after an undo', async () => {
    const editor = await mount();
    click(byText('.jie-btn', 'Rotate'));
    expect(undo().disabled).toBe(false);
    expect(redo().disabled).toBe(true);
    click(undo());
    expect(undo().disabled).toBe(true);
    expect(redo().disabled).toBe(false);
    editor.destroy();
  });
});

describe('history: branching', () => {
  it('a new edit after an undo discards the redo branch', async () => {
    const editor = await mount({ width: 1200, height: 800 });

    click(byText('.jie-btn', 'Rotate')); // A → 800×1200
    click(byText('.jie-tab', 'Resize'));
    setValue(widthInput(), '600', 'change'); // B → 600×900
    expect(dims()).toBe('600 x 900 px');

    click(undo()); // back to A
    expect(dims()).toBe('800 x 1200 px');
    expect(redo().disabled).toBe(false); // B is still redo-able here

    setValue(widthInput(), '200', 'change'); // C → 200×300 (forks a new branch)
    expect(dims()).toBe('200 x 300 px');
    expect(redo().disabled).toBe(true); // B is gone for good
    editor.destroy();
  });
});

describe('history: across screens, reflected in the rendered controls', () => {
  it('undo peels back mixed operations one step at a time', async () => {
    const editor = await mount();

    // step 1: a filter
    click(byText('.jie-tab', 'Filters'));
    click(byText('.jie-thumb', 'Sepia'));
    expect(byText('.jie-thumb', 'Sepia').getAttribute('aria-pressed')).toBe('true');

    // step 2: a finetune slider drag (coalesced into a single step)
    click(byText('.jie-tab', 'Finetune'));
    pointer($('.jie-range'), 'pointerdown'); // onStart opens the step
    setValue($('.jie-range'), '40', 'input'); // live drag replaces it
    expect($('.jie-slider__value').textContent).toBe('40');

    // undo step 2 → brightness back to 0, but the filter stays
    click(undo());
    expect($('.jie-slider__value').textContent).toBe('0');
    click(byText('.jie-tab', 'Filters'));
    expect(byText('.jie-thumb', 'Sepia').getAttribute('aria-pressed')).toBe('true');

    // undo step 1 → filter cleared, nothing left to undo
    click(undo());
    expect(byText('.jie-thumb', 'Original').getAttribute('aria-pressed')).toBe('true');
    expect(byText('.jie-thumb', 'Sepia').getAttribute('aria-pressed')).toBe('false');
    expect(undo().disabled).toBe(true);
    editor.destroy();
  });
});

describe('history: a slider drag is one step', () => {
  it('a finetune gesture (pointerdown + many inputs) undoes in one click', async () => {
    const editor = await mount();
    click(byText('.jie-tab', 'Finetune'));

    const range = $<HTMLInputElement>('.jie-range');
    pointer(range, 'pointerdown');
    setValue(range, '20', 'input');
    setValue(range, '50', 'input');
    setValue(range, '80', 'input');
    expect($('.jie-slider__value').textContent).toBe('80');

    click(undo());
    expect($('.jie-slider__value').textContent).toBe('0'); // whole drag reverted
    expect(undo().disabled).toBe(true); // it was a single history step
    editor.destroy();
  });
});

describe('history: Reset is itself undoable', () => {
  it('undo brings the edits back after a confirmed reset', async () => {
    const editor = await mount({ width: 1200, height: 800, confirm: () => true });
    click(byText('.jie-btn', 'Rotate'));
    expect(dims()).toBe('800 x 1200 px');

    click(byTitle('.jie-btn', 'Reset'));
    expect(dims()).toBe('1200 x 800 px'); // reset applied

    click(undo());
    expect(dims()).toBe('800 x 1200 px'); // …and the reset can be undone
    editor.destroy();
  });
});
