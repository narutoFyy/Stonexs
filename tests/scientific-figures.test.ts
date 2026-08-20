import { describe, expect, test } from 'bun:test';
import { buildScientificScene, sceneElementIds, scientificBackgroundPrompt } from '@/lib/scientific-figures/scene';

describe('scientific figure scene contract', () => {
  test('keeps raster prompt free of editable annotations', () => {
    const prompt = scientificBackgroundPrompt('vehicle, sensor field, and planning trajectory');
    expect(prompt).toContain('no text');
    expect(prompt).toContain('arrows');
    expect(prompt).toContain('watermarks');
  });

  test('creates stable editable IDs for title, stages, and flow arrows', () => {
    const scene = buildScientificScene({
      title: 'Planning method',
      stageLabels: ['Problem', 'Method', 'Validation'],
      width: 2048,
      height: 1152,
    });
    const ids = sceneElementIds(scene);
    expect(scene.width).toBe(2048);
    expect(scene.height).toBe(1152);
    expect(ids).toContain('figure-title');
    expect(ids).toContain('stage-1-label');
    expect(ids).toContain('stage-1-to-2-arrow');
    expect(ids).toContain('stage-3-box');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
