import { describe, expect, it } from 'vitest';
import { createInitialState } from './initial';
import { mergeDesign, normalizeRotation, reduce } from './reducer';
import { present } from './history';
import { createIdentityDesign } from './initial';

describe('normalizeRotation', () => {
  it('snaps to 0/90/180/270', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(89)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
  });
});

describe('mergeDesign', () => {
  it('shallow-merges flip and finetune, replaces arrays', () => {
    const base = createIdentityDesign();
    const merged = mergeDesign(base, {
      flip: { horizontal: true },
      finetune: { brightness: 20 },
      annotations: [],
    });
    expect(merged.flip).toEqual({ horizontal: true, vertical: false });
    expect(merged.finetune.brightness).toBe(20);
    expect(merged.finetune.contrast).toBe(0);
  });

  it('normalises rotation on merge', () => {
    expect(mergeDesign(createIdentityDesign(), { rotate: 89 }).rotate).toBe(90);
  });
});

describe('reduce', () => {
  it('updates ephemeral UI fields without touching history', () => {
    const s0 = createInitialState();
    const s1 = reduce(s0, { activeTab: 'filters', zoom: 2 });
    expect(s1.activeTab).toBe('filters');
    expect(s1.zoom).toBe(2);
    expect(s1.history).toBe(s0.history);
  });

  it('returns the same state reference when nothing changes', () => {
    const s0 = createInitialState();
    expect(reduce(s0, { activeTab: s0.activeTab })).toBe(s0);
  });

  it('a design edit pushes a new history entry', () => {
    const s0 = createInitialState();
    const s1 = reduce(s0, { design: { rotate: 90 } });
    expect(s1.history.entries.length).toBe(2);
    expect(present(s1.history).rotate).toBe(90);
  });

  it('design with commit:false replaces the present entry (drag semantics)', () => {
    let s = createInitialState();
    s = reduce(s, { design: { rotate: 90 } }); // commit -> 2 entries
    s = reduce(s, { design: { rotate: 180 }, commit: false }); // replace
    expect(s.history.entries.length).toBe(2);
    expect(present(s.history).rotate).toBe(180);
  });

  it('history navigation by step performs undo/redo', () => {
    let s = createInitialState();
    s = reduce(s, { design: { rotate: 90 } });
    s = reduce(s, { history: { step: -1 } }); // undo
    expect(present(s.history).rotate).toBe(0);
    s = reduce(s, { history: { step: 1 } }); // redo
    expect(present(s.history).rotate).toBe(90);
  });

  it('history navigation by absolute index jumps anywhere', () => {
    let s = createInitialState();
    s = reduce(s, { design: { rotate: 90 } });
    s = reduce(s, { design: { rotate: 180 } });
    s = reduce(s, { history: { index: 0 } });
    expect(present(s.history).rotate).toBe(0);
  });

  it('resetDesign records an identity entry', () => {
    let s = createInitialState();
    s = reduce(s, { design: { rotate: 90 } });
    s = reduce(s, { resetDesign: true });
    expect(present(s.history).rotate).toBe(0);
    expect(s.history.entries.length).toBe(3);
  });

  it('sanitises invalid zoom', () => {
    expect(reduce(createInitialState(), { zoom: -5 }).zoom).toBe(1);
    expect(reduce(createInitialState(), { zoom: 1000 }).zoom).toBe(64);
  });
});
