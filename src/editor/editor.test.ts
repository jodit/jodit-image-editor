import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageEditor, init } from './editor';
import { ImageProcessor } from '../image/processor';
import type { ImageCodec } from '../image/codec';
import { solidRaster } from '../core/raster/raster';
import { present } from '../core/state/history';
import type { EditorPlugin } from '../plugins/types';

/**
 * Editor facade tests. A fake codec keeps everything canvas-free so the full
 * init → edit → undo → export → destroy lifecycle runs under jsdom. The
 * SyncScheduler makes renders deterministic.
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

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  document.body.innerHTML = '';
});

describe('ImageEditor', () => {
  it('renders the shell into the container on init', () => {
    const editor = makeEditor();
    expect(document.querySelector('.jie')).not.toBeNull();
    expect(document.querySelector('[data-jie-canvas]')).not.toBeNull();
    editor.destroy();
  });

  it('exposes state and routes update() through the store', () => {
    const editor = makeEditor();
    expect(editor.state.activeTab).toBe('adjust');
    editor.update({ activeTab: 'filters' });
    expect(editor.state.activeTab).toBe('filters');
    editor.destroy();
  });

  it('records design edits and supports undo via a history patch (not a method)', () => {
    const editor = makeEditor();
    editor.update({ design: { rotate: 90 } });
    expect(present(editor.state.history).rotate).toBe(90);
    editor.update({ history: { step: -1 } });
    expect(present(editor.state.history).rotate).toBe(0);
    editor.destroy();
  });

  it('fromBlob decodes and marks the editor ready', async () => {
    const editor = makeEditor();
    await editor.fromBlob(new Blob(['img'], { type: 'image/png' }));
    expect(fakeCodec.decode).toHaveBeenCalledOnce();
    expect(editor.state.status).toBe('ready');
    expect(editor.state.source).toEqual({
      width: 20,
      height: 10,
      name: null,
      mimeType: 'image/png',
    });
    editor.destroy();
  });

  it('toBlob throws without an image, then encodes once loaded', async () => {
    const editor = makeEditor();
    await expect(editor.toBlob()).rejects.toThrow(/No image/);
    await editor.fromBlob(new Blob(['img'], { type: 'image/png' }));
    const blob = await editor.toBlob({ type: 'image/png' });
    expect(blob).toBeInstanceOf(Blob);
    expect(fakeCodec.encode).toHaveBeenCalledOnce();
    editor.destroy();
  });

  it('applies plugins via the extension API', () => {
    const setup = vi.fn();
    const plugin: EditorPlugin = { name: 'demo', setup };
    const editor = makeEditor({ plugins: [plugin] });
    expect(setup).toHaveBeenCalledOnce();
    const api = setup.mock.calls[0]![0];
    expect(typeof api.registerTool).toBe('function');
    expect(typeof api.registerFilter).toBe('function');
    editor.destroy();
  });

  it('a plugin can register a tool that appears in the rail', () => {
    const plugin: EditorPlugin = {
      name: 'extra-tab',
      setup: (api) =>
        api.registerTool({ id: 'sticker', label: 'Sticker', icon: '', renderPanel: () => null }),
    };
    const editor = makeEditor({ plugins: [plugin] });
    const labels = [...document.querySelectorAll('.jie-tab')].map((n) => n.textContent);
    expect(labels.some((l) => l?.includes('Sticker'))).toBe(true);
    editor.destroy();
  });

  it('Reset is gated by the injected confirm: declined leaves edits intact', () => {
    const confirm = vi.fn(() => false);
    const editor = makeEditor({ confirm });
    editor.update({ design: { rotate: 90 } });
    // Reset intent flows through the app context the editor builds for the view.
    const resetBtn = [...document.querySelectorAll('.jie-topbar__actions button')].find(
      (b) => b.getAttribute('title') === 'Reset',
    ) as HTMLButtonElement;
    resetBtn.click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(present(editor.state.history).rotate).toBe(90); // not reset
    editor.destroy();
  });

  it('Reset applies when confirm is accepted', () => {
    const confirm = vi.fn(() => true);
    const editor = makeEditor({ confirm });
    editor.update({ design: { rotate: 90 } });
    const resetBtn = [...document.querySelectorAll('.jie-topbar__actions button')].find(
      (b) => b.getAttribute('title') === 'Reset',
    ) as HTMLButtonElement;
    resetBtn.click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(present(editor.state.history).rotate).toBe(0); // reset to identity
    editor.destroy();
  });

  it('destroy removes the tree and stops reacting to updates', () => {
    const editor = makeEditor();
    editor.destroy();
    expect(document.querySelector('.jie')).toBeNull();
    expect(() => editor.update({ activeTab: 'resize' })).not.toThrow();
  });

  it('init() is a thin factory for new ImageEditor', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = init({ container, scheduler: { request: (t) => t(), flush() {}, cancel() {} } });
    expect(editor).toBeInstanceOf(ImageEditor);
    editor.destroy();
  });
});
