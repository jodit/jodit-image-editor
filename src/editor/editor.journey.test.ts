import { afterEach, describe, expect, it } from 'vitest';
import { ImageEditor } from './editor';
import { ImageProcessor } from '../image/processor';
import type { ImageCodec } from '../image/codec';
import { SyncScheduler } from '../core/scheduler/scheduler';
import { solidRaster } from '../core/raster/raster';

/**
 * Multi-step *journeys*: each test is a sequence of interface actions that build
 * on one another (a realistic editing session), asserting on the rendered
 * output at every checkpoint — never on `editor.state`. jsdom + SyncScheduler
 * keep it fast and synchronous; a fake processor avoids any real canvas.
 */
interface MountOptions {
  width?: number;
  height?: number;
  viewport?: boolean;
  confirm?: () => boolean;
  /** Sizes returned by successive `decode` calls (for reload journeys). */
  sizes?: Array<[number, number]>;
}

async function mount(opts: MountOptions = {}): Promise<ImageEditor> {
  const sizes = opts.sizes ?? [[opts.width ?? 1200, opts.height ?? 800]];
  let call = 0;
  const codec: ImageCodec = {
    decode: async () => {
      const [w, h] = sizes[Math.min(call++, sizes.length - 1)]!;
      return solidRaster(w, h, [128, 128, 128, 255]);
    },
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
    ...(opts.confirm ? { confirm: opts.confirm } : {}),
  });
  await editor.fromBlob(new Blob(['img'], { type: 'image/png' }));
  if (opts.viewport) editor.update({ viewport: { width: 1000, height: 1000 } });
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
const pointer = (node: EventTarget, type: string, x = 0, y = 0): void =>
  void node.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
const setValue = (input: HTMLInputElement, value: string, event: 'input' | 'change'): void => {
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
};
const dims = (): string => $('.jie-topbar__meta span').textContent ?? '';
const resizeInputs = (): HTMLInputElement[] =>
  all('.jie-fieldrow input.jie-input') as HTMLInputElement[];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('journey: a full editing session across every screen', () => {
  it('crop → rotate → finetune → filter → resize → export', async () => {
    const editor = await mount({ width: 1200, height: 800, viewport: true });

    // 1. crop with the SE handle — width shrinks, height stays
    const se = $('.jie-crop__handle[data-h="se"]');
    pointer(se, 'pointerdown', 900, 900);
    pointer(window, 'pointermove', 800, 900);
    pointer(window, 'pointerup', 800, 900);
    const cropped = dims().match(/^(\d+) x (\d+) px$/)!;
    expect(Number(cropped[2])).toBe(800);
    expect(Number(cropped[1])).toBeLessThan(1200);

    // 2. tilt the crop frame with the rotation knob
    const knob = $('.jie-crop__rotate');
    pointer(knob, 'pointerdown', 300, 300);
    pointer(window, 'pointermove', 800, 800);
    pointer(window, 'pointerup', 800, 800);
    expect($<HTMLElement>('.jie-crop').style.transform).not.toBe('rotate(0deg)');
    expect($<HTMLElement>('.jie-crop').style.transform).toMatch(/^rotate\(-?\d/);

    // 3. finetune: Contrast sub-tab + slider
    click(byText('.jie-tab', 'Finetune'));
    click(byText('.jie-btn', 'Contrast'));
    setValue($('.jie-range'), '30', 'input');
    expect($('.jie-slider__value').textContent).toBe('30');

    // 4. filter: Sepia
    click(byText('.jie-tab', 'Filters'));
    click(byText('.jie-thumb', 'Sepia'));
    expect(byText('.jie-thumb', 'Sepia').getAttribute('aria-pressed')).toBe('true');

    // 5. resize: type a new width
    click(byText('.jie-tab', 'Resize'));
    setValue(resizeInputs()[0]!, '500', 'change');
    expect(resizeInputs()[0]!.value).toBe('500');

    // 6. export the cumulative result
    const blob = await editor.toBlob({ type: 'image/png' });
    expect(blob).toBeInstanceOf(Blob);
    editor.destroy();
  });
});

describe('journey: multi-level undo / redo through the toolbar', () => {
  it('walks the history back and forth, reflected in the dimensions', async () => {
    const editor = await mount({ width: 1200, height: 800 });
    const undo = () => byTitle('.jie-btn', 'Undo');
    const redo = () => byTitle('.jie-btn', 'Redo');

    expect(undo().disabled).toBe(true); // nothing to undo yet

    click(byText('.jie-btn', 'Rotate')); // step 1 → 800×1200
    expect(dims()).toBe('800 x 1200 px');

    click(byText('.jie-tab', 'Resize')); // step 2 → 400×600 (locked ratio)
    setValue(resizeInputs()[0]!, '400', 'change');
    expect(dims()).toBe('400 x 600 px');

    click(undo());
    expect(dims()).toBe('800 x 1200 px');
    click(undo());
    expect(dims()).toBe('1200 x 800 px');
    expect(undo().disabled).toBe(true); // back at the origin

    click(redo());
    expect(dims()).toBe('800 x 1200 px');
    click(redo());
    expect(dims()).toBe('400 x 600 px');
    expect(redo().disabled).toBe(true); // nothing left to redo
    editor.destroy();
  });
});

describe('journey: a whole drag gesture is a single undo step', () => {
  it('many pointermoves coalesce, and one Undo reverts the entire crop', async () => {
    const editor = await mount({ width: 1200, height: 800, viewport: true });
    expect(dims()).toBe('1200 x 800 px');

    const se = $('.jie-crop__handle[data-h="se"]');
    pointer(se, 'pointerdown', 900, 900);
    pointer(window, 'pointermove', 850, 850);
    pointer(window, 'pointermove', 800, 800);
    pointer(window, 'pointermove', 750, 750); // one continuous gesture
    pointer(window, 'pointerup', 750, 750);
    expect(dims()).not.toBe('1200 x 800 px');

    click(byTitle('.jie-btn', 'Undo'));
    expect(dims()).toBe('1200 x 800 px'); // whole gesture undone at once
    expect(byTitle('.jie-btn', 'Undo').disabled).toBe(true); // it was a single step
    editor.destroy();
  });
});

describe('journey: loading a new image resets the edits', () => {
  it('edits the first image, then a second load clears them', async () => {
    const editor = await mount({
      sizes: [
        [1200, 800],
        [600, 900],
      ],
    });
    expect(dims()).toBe('1200 x 800 px');

    click(byText('.jie-btn', 'Rotate'));
    expect(dims()).toBe('800 x 1200 px');

    await editor.fromBlob(new Blob(['second'], { type: 'image/png' }));
    expect(dims()).toBe('600 x 900 px'); // new size, rotation gone
    editor.destroy();
  });
});

describe('journey: watermark hands off to annotate, editing continues', () => {
  it('stamp → land on annotate → edit text → toggle bold → realign', async () => {
    const editor = await mount();

    click(byText('.jie-tab', 'Watermark'));
    setValue($('#jie-wm-input'), 'Photo ©', 'input');
    click(byText('.jie-btn', 'Add watermark'));

    // handed off to Annotate with the text pre-filled
    expect(byText('.jie-tab', 'Annotate').getAttribute('aria-selected')).toBe('true');
    const text = $<HTMLInputElement>('.jie-panel input.jie-input');
    expect(text.value).toBe('Photo ©');

    // continue editing the same label
    setValue(text, 'Final', 'input');
    expect($<HTMLInputElement>('.jie-panel input.jie-input').value).toBe('Final');

    const bold = byText('.jie-btn--bold', 'B');
    click(bold);
    expect(byText('.jie-btn--bold', 'B').className).toContain('jie-btn--active');

    click(byText('.jie-btn', 'Right'));
    expect(byText('.jie-btn', 'Right').className).toContain('jie-btn--active');
    editor.destroy();
  });
});
