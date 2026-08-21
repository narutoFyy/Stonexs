import { describe, expect, test } from 'bun:test';
import {
  buildScientificScene,
  sceneElementIds,
  SCIENTIFIC_FIGURE_STYLE_PROMPT,
  scientificBackgroundPrompt,
} from '@/lib/scientific-figures/scene';

describe('scientific figure scene contract', () => {
  test('keeps raster prompt free of editable annotations', () => {
    const prompt = scientificBackgroundPrompt('vehicle, sensor field, and planning trajectory');
    expect(prompt).toContain('no text');
    expect(prompt).toContain('arrows');
    expect(prompt).toContain('watermarks');
    expect(prompt).toContain('supporting background plate');
    expect(prompt).toContain('central 55 percent');
    expect(prompt).toContain('flat-to-soft-3D');
    expect(prompt).toContain('not the final figure');
    expect(prompt).toContain(SCIENTIFIC_FIGURE_STYLE_PROMPT);
  });

  test('creates stable editable IDs for title, stages, flow arrows, and stage content', () => {
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
    expect(ids).toContain('stage-1-camera-icon');
    expect(ids).toContain('stage-2-fusion-node');
    expect(ids).toContain('stage-3-trajectory');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
