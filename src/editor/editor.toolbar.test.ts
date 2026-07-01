import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { init } from './editor';
import { ImageEditor } from './editor';
import { ImageProcessor } from '../image/processor';
import type { ImageCodec } from '../image/codec';
import { solidRaster } from '../core/raster/raster';

/**
 * Covers the embeddable-toolbar API: hiding the built-in top bar
 * (`showToolbar`) and driving Save / Save as from outside via `save()` /
 * `saveAs()`, plus the built-in "Save as" button.
 */
const fakeCodec: ImageCodec = {
  decode: vi.fn(async () => solidRaster(20, 10, [10, 20, 30, 255])),
  encode: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
};

function makeEditor(extra: Partial<Parameters<typeof init>[0]> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const processor = new ImageProcessor({
    codec: fakeCodec,
    createCanvas: () => {
      throw new Error('no canvas in tests');
    },
  });
  return new ImageEditor({
    container,
    processor,
    scheduler: { request: (t) => t(), flush: () => {}, cancel: () => {} },
    ...extra,
  });
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const loaded = () => new Blob(['img'], { type: 'image/png' });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  document.body.innerHTML = '';
});

describe('toolbar visibility', () => {
  it('renders the built-in toolbar with Save and Save as by default', () => {
    makeEditor();
    const labels = [...document.querySelectorAll('.jie-topbar__save button span')].map(
      (n) => n.textContent,
    );
    expect(labels).toEqual(['Save', 'Save as']);
  });

  it('hides the toolbar when showToolbar is false', () => {
    makeEditor({ state: { showToolbar: false } });
    expect(document.querySelector('.jie-topbar')).toBeNull();
    expect(document.querySelector('.jie-body')).not.toBeNull();
  });

  it('update({ showToolbar }) toggles the toolbar at runtime', () => {
    const editor = makeEditor();
    expect(document.querySelector('.jie-topbar')).not.toBeNull();
    editor.update({ showToolbar: false });
    expect(document.querySelector('.jie-topbar')).toBeNull();
    editor.update({ showToolbar: true });
    expect(document.querySelector('.jie-topbar')).not.toBeNull();
  });
});

describe('external save handlers', () => {
  it('save() exports and calls onSave with the blob and the editor', async () => {
    const onSave = vi.fn();
    const editor = makeEditor({ onSave, state: { showToolbar: false } });
    await editor.fromBlob(loaded());

    await editor.save();

    expect(onSave).toHaveBeenCalledTimes(1);
    const call = onSave.mock.calls[0] ?? [];
    expect(call[0]).toBeInstanceOf(Blob);
    expect(call[1]).toBe(editor);
  });

  it('saveAs() exports and calls onSaveAs', async () => {
    const onSaveAs = vi.fn();
    const editor = makeEditor({ onSaveAs, state: { showToolbar: false } });
    await editor.fromBlob(loaded());

    await editor.saveAs();

    expect(onSaveAs).toHaveBeenCalledTimes(1);
    expect((onSaveAs.mock.calls[0] ?? [])[0]).toBeInstanceOf(Blob);
  });

  it('save()/saveAs() are no-ops before an image is loaded', async () => {
    const onSave = vi.fn();
    const onSaveAs = vi.fn();
    const editor = makeEditor({ onSave, onSaveAs });

    await editor.save();
    await editor.saveAs();

    expect(onSave).not.toHaveBeenCalled();
    expect(onSaveAs).not.toHaveBeenCalled();
  });

  it('the built-in "Save as" button triggers onSaveAs', async () => {
    const onSaveAs = vi.fn();
    const editor = makeEditor({ onSaveAs });
    await editor.fromBlob(loaded());

    const button = [...document.querySelectorAll('.jie-topbar__save button')].find(
      (b) => b.textContent === 'Save as',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();

    button.click();
    await tick();

    expect(onSaveAs).toHaveBeenCalledTimes(1);
  });
});
