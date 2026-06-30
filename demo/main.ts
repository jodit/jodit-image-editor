import { ImageEditor } from '../src/index';
import sampleUrl from './assets/sample.jpg';

/**
 * Demo wiring. Note how the buttons never reach inside the editor — they all go
 * through the documented public surface: `update(patch)` for navigation/undo and
 * `toBlob()` for export. Undo/redo are history-navigation patches, not methods.
 */
const editor = new ImageEditor({
  container: '#editor',
  onSave: (blob) => showResult(blob),
});

// Load the bundled free-license sample on start.
void fetch(sampleUrl)
  .then((r) => r.blob())
  .then((blob) => editor.fromBlob(new File([blob], 'sample.jpg', { type: 'image/jpeg' })));

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

// Tab buttons — pure `update({ activeTab })`.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
  button.addEventListener('click', () => {
    if (button.dataset.tab) editor.update({ activeTab: button.dataset.tab });
  });
}

$('#undo').addEventListener('click', () => editor.update({ history: { step: -1 } }));
$('#redo').addEventListener('click', () => editor.update({ history: { step: 1 } }));
$('#theme').addEventListener('click', () =>
  editor.update({ theme: editor.state.theme === 'dark' ? 'light' : 'dark' }),
);

$('#export').addEventListener('click', () => {
  void editor.toBlob({ type: 'image/png' }).then(showResult);
});

$<HTMLInputElement>('#file').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void editor.fromBlob(file);
});

function showResult(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  $('#result').hidden = false;
  $<HTMLImageElement>('#result-img').src = url;
  const link = $<HTMLAnchorElement>('#result-link');
  link.href = url;
}
