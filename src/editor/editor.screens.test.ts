import { afterEach, describe, expect, it } from 'vitest';
import { ImageEditor } from './editor';
import { ImageProcessor } from '../image/processor';
import type { ImageCodec } from '../image/codec';
import { SyncScheduler } from '../core/scheduler/scheduler';
import { solidRaster } from '../core/raster/raster';

/**
 * One interface-driven test per screen. We click/drag the *rendered* controls
 * and assert on the *rendered* result (text, attributes, input values, presence
 * of nodes) — never on `editor.state`. jsdom + SyncScheduler keep it fast and
 * synchronous; a fake processor avoids any real canvas.
 */
interface MountOptions {
  width?: number;
  height?: number;
  viewport?: boolean;
  confirm?: () => boolean;
}

async function mount(opts: MountOptions = {}): Promise<ImageEditor> {
  const { width = 1200, height = 800, viewport = false, confirm } = opts;
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

// --- rendered-DOM queries (testing-library style) ---------------------------
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
const byTitle = (sel: string, title: string): HTMLElement => {
  const el = all(sel).find((n) => n.getAttribute('title') === title);
  if (!el) throw new Error(`no ${sel} titled "${title}"`);
  return el as HTMLElement;
};
const click = (node: EventTarget): void =>
  void node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const dims = (): string => $('.jie-topbar__meta span').textContent ?? '';

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
describe('rail navigation', () => {
  const cases: Array<[label: string, marker: () => Element]> = [
    ['Adjust', () => byText('.jie-btn', 'Rotate')],
    ['Finetune', () => $('.jie-slider')],
    ['Filters', () => $('.jie-thumbs')],
    ['Watermark', () => $('#jie-wm-input')],
    ['Annotate', () => byText('.jie-btn', 'Text')],
    ['Resize', () => $('.jie-fieldrow input.jie-input')],
  ];

  it('every tab selects itself and renders its own panel', async () => {
    const editor = await mount();
    for (const [label, marker] of cases) {
      click(byText('.jie-tab', label));
      expect(byText('.jie-tab', label).getAttribute('aria-selected')).toBe('true');
      expect(marker()).toBeTruthy(); // the panel for that tab is on screen
    }
    editor.destroy();
  });
});

describe('Adjust screen', () => {
  it('Rotate swaps the rendered dimensions', async () => {
    const editor = await mount({ width: 1200, height: 800 });
    expect(dims()).toBe('1200 x 800 px');
    click(byText('.jie-btn', 'Rotate'));
    expect(dims()).toBe('800 x 1200 px');
    editor.destroy();
  });

  it('the Crop toggle shows and hides the crop overlay', async () => {
    const editor = await mount({ viewport: true });
    expect(document.querySelector('.jie-crop')).not.toBeNull(); // cropping by default
    click(byText('.jie-btn', 'Crop'));
    expect(document.querySelector('.jie-crop')).toBeNull();
    click(byText('.jie-btn', 'Crop'));
    expect(document.querySelector('.jie-crop')).not.toBeNull();
    editor.destroy();
  });
});

describe('Finetune screen', () => {
  it('switching a sub-tab and dragging the slider updates the readout', async () => {
    const editor = await mount();
    click(byText('.jie-tab', 'Finetune'));

    click(byText('.jie-btn', 'Contrast'));
    expect($('.jie-slider__label').textContent).toBe('Contrast');
    expect($('.jie-slider__value').textContent).toBe('0');

    const range = $<HTMLInputElement>('.jie-range');
    range.value = '40';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    expect($('.jie-slider__value').textContent).toBe('40');
    editor.destroy();
  });
});

describe('Filters screen', () => {
  it('selecting a filter thumbnail marks it pressed', async () => {
    const editor = await mount();
    click(byText('.jie-tab', 'Filters'));
    expect(byText('.jie-thumb', 'Original').getAttribute('aria-pressed')).toBe('true');

    click(byText('.jie-thumb', 'Sepia'));
    expect(byText('.jie-thumb', 'Sepia').getAttribute('aria-pressed')).toBe('true');
    expect(byText('.jie-thumb', 'Original').getAttribute('aria-pressed')).toBe('false');
    editor.destroy();
  });
});

describe('Resize screen', () => {
  it('keeps aspect ratio locked, unlocks, and resets — all reflected in the inputs', async () => {
    const editor = await mount({ width: 1200, height: 800 });
    click(byText('.jie-tab', 'Resize'));

    const inputs = () => all('.jie-fieldrow input.jie-input') as HTMLInputElement[];
    expect(inputs().map((i) => i.value)).toEqual(['1200', '800']);

    // change width → height follows (locked, ratio 1.5)
    const width = inputs()[0]!;
    width.value = '600';
    width.dispatchEvent(new Event('change', { bubbles: true }));
    expect(inputs().map((i) => i.value)).toEqual(['600', '400']);

    // unlock → width changes alone
    click(byTitle('.jie-btn', 'Aspect ratio locked'));
    expect(byTitle('.jie-btn', 'Aspect ratio unlocked')).toBeTruthy();
    const w2 = inputs()[0]!;
    w2.value = '300';
    w2.dispatchEvent(new Event('change', { bubbles: true }));
    expect(inputs().map((i) => i.value)).toEqual(['300', '400']);

    // reset → back to the source size
    click(byTitle('.jie-btn', 'Reset size'));
    expect(inputs().map((i) => i.value)).toEqual(['1200', '800']);
    editor.destroy();
  });
});

describe('Annotate screen', () => {
  it('adds text, edits it, and toggles bold — reflected in the rendered controls', async () => {
    const editor = await mount();
    click(byText('.jie-tab', 'Annotate'));
    click(byText('.jie-btn', 'Text')); // add a label

    const textInput = $<HTMLInputElement>('.jie-panel input.jie-input');
    expect(textInput.value).toBe('Text');

    textInput.value = 'Hello';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect($<HTMLInputElement>('.jie-panel input.jie-input').value).toBe('Hello');

    const bold = byText('.jie-btn--bold', 'B');
    expect(bold.className).not.toContain('jie-btn--active');
    click(bold);
    expect(byText('.jie-btn--bold', 'B').className).toContain('jie-btn--active');
    editor.destroy();
  });
});

describe('Watermark screen', () => {
  it('stamps the typed text and hands off to the Annotate panel', async () => {
    const editor = await mount();
    click(byText('.jie-tab', 'Watermark'));
    $<HTMLInputElement>('#jie-wm-input').value = 'My Mark';
    click(byText('.jie-btn', 'Add watermark'));

    expect(byText('.jie-tab', 'Annotate').getAttribute('aria-selected')).toBe('true');
    expect($<HTMLInputElement>('.jie-panel input.jie-input').value).toBe('My Mark');
    editor.destroy();
  });
});

describe('top bar', () => {
  it('undo / redo move the rendered dimensions back and forth', async () => {
    const editor = await mount({ width: 1200, height: 800 });
    click(byText('.jie-btn', 'Rotate'));
    expect(dims()).toBe('800 x 1200 px');
    click(byTitle('.jie-btn', 'Undo'));
    expect(dims()).toBe('1200 x 800 px');
    click(byTitle('.jie-btn', 'Redo'));
    expect(dims()).toBe('800 x 1200 px');
    editor.destroy();
  });

  it('zoom buttons update the percentage readout', async () => {
    const editor = await mount();
    // direct child — descendant `span` would match the icon spans in the buttons
    expect($('.jie-zoom > span').textContent).toBe('100%');
    click(byTitle('.jie-btn', 'Zoom in'));
    expect($('.jie-zoom > span').textContent).toBe('120%');
    click(byTitle('.jie-btn', 'Zoom out'));
    expect($('.jie-zoom > span').textContent).toBe('100%');
    editor.destroy();
  });

  it('Reset reverts edits once the confirmation is accepted', async () => {
    const editor = await mount({ width: 1200, height: 800, confirm: () => true });
    click(byText('.jie-btn', 'Rotate'));
    expect(dims()).toBe('800 x 1200 px');
    click(byTitle('.jie-btn', 'Reset'));
    expect(dims()).toBe('1200 x 800 px');
    editor.destroy();
  });
});
