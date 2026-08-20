export interface ScientificFigureSceneInput {
  title: string;
  stageLabels: [string, string, string];
  width: number;
  height: number;
}

export function scientificBackgroundPrompt(description: string) {
  return [
    'Create a clean high-resolution raster background for an editable scientific workflow figure.',
    description.trim(),
    'Use a restrained white, neutral gray, and Yves Klein blue palette with precise scientific visual detail.',
    'Leave a clear horizontal band through the middle for later editable vector annotations.',
    'Raster background only. Absolutely no text, labels, callouts, arrows, borders, boxes, circles, legends, panel letters, logos, signatures, or watermarks.',
  ].join(' ');
}

export function buildScientificScene({ title, stageLabels, width, height }: ScientificFigureSceneInput) {
  const margin = Math.round(width * 0.06);
  const gap = Math.round(width * 0.045);
  const boxWidth = Math.round((width - margin * 2 - gap * 2) / 3);
  const boxHeight = Math.round(height * 0.22);
  const boxY = Math.round(height * 0.42);
  const titleSize = Math.max(28, Math.round(height * 0.055));
  const labelSize = Math.max(20, Math.round(height * 0.032));
  const elements: Array<Record<string, unknown>> = [
    {
      id: 'figure-title',
      type: 'text',
      x: margin,
      y: Math.round(height * 0.11),
      text: title,
      'font-family': 'Arial, Helvetica, sans-serif',
      'font-size': titleSize,
      'font-weight': 700,
      fill: '#111111',
    },
    {
      id: 'figure-rule',
      type: 'line',
      x1: margin,
      y1: Math.round(height * 0.15),
      x2: width - margin,
      y2: Math.round(height * 0.15),
      stroke: '#002FA7',
      'stroke-width': 3,
    },
  ];

  stageLabels.forEach((label, index) => {
    const x = margin + index * (boxWidth + gap);
    elements.push(
      {
        id: `stage-${index + 1}-box`,
        type: 'rect',
        x,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        rx: 6,
        style: 'stage-box',
      },
      {
        id: `stage-${index + 1}-number`,
        type: 'text',
        x: x + Math.round(boxWidth * 0.08),
        y: boxY + Math.round(boxHeight * 0.28),
        text: `0${index + 1}`,
        'font-family': 'Arial, Helvetica, sans-serif',
        'font-size': Math.round(labelSize * 0.7),
        'font-weight': 700,
        fill: '#002FA7',
      },
      {
        id: `stage-${index + 1}-label`,
        type: 'text',
        x: x + boxWidth / 2,
        y: boxY + Math.round(boxHeight * 0.64),
        text: label,
        'text-anchor': 'middle',
        'font-family': 'Arial, Helvetica, sans-serif',
        'font-size': labelSize,
        'font-weight': 600,
        fill: '#111111',
      },
    );
    if (index < 2) {
      elements.push({
        id: `stage-${index + 1}-to-${index + 2}-arrow`,
        type: 'line',
        x1: x + boxWidth + Math.round(gap * 0.18),
        y1: boxY + boxHeight / 2,
        x2: x + boxWidth + Math.round(gap * 0.82),
        y2: boxY + boxHeight / 2,
        style: 'flow-arrow',
        'arrow-end': true,
      });
    }
  });

  return {
    version: 1,
    width,
    height,
    background: 'background.png',
    styles: {
      'stage-box': {
        fill: '#FFFFFF',
        'fill-opacity': 0.93,
        stroke: '#002FA7',
        'stroke-width': 3,
      },
      'flow-arrow': {
        stroke: '#002FA7',
        'stroke-width': 4,
        'stroke-linecap': 'round',
      },
    },
    elements,
  };
}

export function sceneElementIds(scene: ReturnType<typeof buildScientificScene>) {
  return scene.elements.map((element) => String(element.id));
}
