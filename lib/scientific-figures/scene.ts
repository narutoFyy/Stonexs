export interface ScientificFigureSceneInput {
  title: string;
  stageLabels: [string, string, string];
  width: number;
  height: number;
}

export const SCIENTIFIC_FIGURE_STYLE_PROMPT = [
  'Publication-ready SCI scientific illustration style for a structured editable figure.',
  'Use a clean flat-to-soft-3D technical illustration language with crisp contours, matte materials, soft diffuse lighting, low visual noise, and restrained white, neutral gray, cobalt blue, and small orange accents.',
  'Use a wide landscape composition and keep the central 55 percent visually quiet with low contrast for later editable SVG annotations; place concrete supporting objects near the left, right, upper, and outer margins.',
  'Treat this as a supporting background plate, not the final figure: preserve realistic scientific proportions, coherent object geometry, consistent scale, and generous whitespace.',
  'Do not invent measurements, experimental results, labels, or unexplained components.',
  'no text, labels, numbers, glyphs, callouts, arrows, connector lines, borders, boxes, cards, legends, panel letters, logos, signatures, watermarks, fake UI, complete workflow, process chart, or decorative clutter.',
].join(' ');

export function scientificBackgroundPrompt(description: string) {
  return [
    'Create a high-resolution raster-only background plate for an editable scientific figure.',
    'Content brief:',
    description.trim(),
    SCIENTIFIC_FIGURE_STYLE_PROMPT,
  ].join(' ');
}

export function buildScientificScene({ title, stageLabels, width, height }: ScientificFigureSceneInput) {
  const margin = Math.round(width * 0.06);
  const gap = Math.round(width * 0.045);
  const boxWidth = Math.round((width - margin * 2 - gap * 2) / 3);
  const boxHeight = Math.round(height * 0.28);
  const boxY = Math.round(height * 0.42);
  const innerPad = Math.round(boxWidth * 0.07);
  const bodyTop = boxY + Math.round(boxHeight * 0.29);
  const bodyBottom = boxY + boxHeight - Math.round(boxHeight * 0.09);
  const titleSize = Math.min(56, Math.max(30, Math.round(height * 0.05)));
  const labelSize = Math.min(32, Math.max(20, Math.round(height * 0.028)));
  const smallSize = Math.min(22, Math.max(15, Math.round(height * 0.018)));
  const fontFamily = 'Noto Sans CJK SC, Noto Sans CJK, Arial, Helvetica, sans-serif';
  const cardGap = Math.round(boxWidth * 0.025);
  const cardWidth = Math.round((boxWidth - innerPad * 2 - cardGap * 2) / 3);
  const cardHeight = Math.round(boxHeight * 0.42);
  const cardY = bodyTop;
  const elements: Array<Record<string, unknown>> = [
    {
      id: 'figure-title',
      type: 'text',
      x: margin,
      y: Math.round(height * 0.11),
      text: title,
      'font-family': fontFamily,
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
        y: boxY + Math.round(boxHeight * 0.18),
        text: `0${index + 1}`,
        'font-family': fontFamily,
        'font-size': Math.round(labelSize * 0.72),
        'font-weight': 700,
        fill: '#002FA7',
      },
      {
        id: `stage-${index + 1}-label`,
        type: 'text',
        x: x + Math.round(boxWidth * 0.23),
        y: boxY + Math.round(boxHeight * 0.18),
        text: label,
        'font-family': fontFamily,
        'font-size': labelSize,
        'font-weight': 600,
        fill: '#111111',
      },
    );

    if (index === 0) {
      const inputCardXs = [0, 1, 2].map((cardIndex) => x + innerPad + cardIndex * (cardWidth + cardGap));
      elements.push({
        id: 'stage-1-content',
        type: 'group',
        children: [
          ...inputCardXs.map((cardX, cardIndex) => ({
            id: `stage-1-input-card-${cardIndex + 1}`,
            type: 'rect',
            x: cardX,
            y: cardY,
            width: cardWidth,
            height: cardHeight,
            rx: 8,
            style: 'stage-card',
          })),
          {
            id: 'stage-1-camera-icon',
            type: 'rect',
            x: inputCardXs[0] + Math.round(cardWidth * 0.29),
            y: cardY + Math.round(cardHeight * 0.19),
            width: Math.round(cardWidth * 0.42),
            height: Math.round(cardHeight * 0.34),
            rx: 5,
            style: 'icon-blue',
          },
          {
            id: 'stage-1-camera-lens',
            type: 'circle',
            cx: inputCardXs[0] + Math.round(cardWidth * 0.5),
            cy: cardY + Math.round(cardHeight * 0.36),
            r: Math.round(cardWidth * 0.09),
            style: 'icon-lens',
          },
          {
            id: 'stage-1-camera-label',
            type: 'text',
            x: inputCardXs[0] + cardWidth / 2,
            y: cardY + Math.round(cardHeight * 0.82),
            text: '相机',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 600,
            fill: '#15315f',
          },
          {
            id: 'stage-1-lidar-cloud',
            type: 'group',
            children: [
              ...[
                [0.29, 0.29],
                [0.42, 0.23],
                [0.54, 0.34],
                [0.65, 0.25],
                [0.37, 0.46],
                [0.51, 0.53],
                [0.63, 0.45],
              ].map(([dx, dy], pointIndex) => ({
                id: `stage-1-lidar-point-${pointIndex + 1}`,
                type: 'circle',
                cx: inputCardXs[1] + Math.round(cardWidth * dx),
                cy: cardY + Math.round(cardHeight * dy),
                r: Math.max(3, Math.round(cardWidth * 0.025)),
                fill: pointIndex % 2 ? '#f0a34a' : '#2c66c3',
              })),
            ],
          },
          {
            id: 'stage-1-lidar-label',
            type: 'text',
            x: inputCardXs[1] + cardWidth / 2,
            y: cardY + Math.round(cardHeight * 0.82),
            text: '激光雷达',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 600,
            fill: '#15315f',
          },
          {
            id: 'stage-1-radar-arcs',
            type: 'group',
            children: [
              {
                id: 'stage-1-radar-arc-1',
                type: 'path',
                d: `M ${inputCardXs[2] + Math.round(cardWidth * 0.29)} ${cardY + Math.round(cardHeight * 0.53)} A ${Math.round(cardWidth * 0.19)} ${Math.round(cardWidth * 0.19)} 0 0 1 ${inputCardXs[2] + Math.round(cardWidth * 0.71)} ${cardY + Math.round(cardHeight * 0.53)}`,
                style: 'icon-line',
              },
              {
                id: 'stage-1-radar-arc-2',
                type: 'path',
                d: `M ${inputCardXs[2] + Math.round(cardWidth * 0.38)} ${cardY + Math.round(cardHeight * 0.53)} A ${Math.round(cardWidth * 0.11)} ${Math.round(cardWidth * 0.11)} 0 0 1 ${inputCardXs[2] + Math.round(cardWidth * 0.62)} ${cardY + Math.round(cardHeight * 0.53)}`,
                style: 'icon-line',
              },
              {
                id: 'stage-1-radar-dot',
                type: 'circle',
                cx: inputCardXs[2] + cardWidth / 2,
                cy: cardY + Math.round(cardHeight * 0.53),
                r: Math.max(4, Math.round(cardWidth * 0.035)),
                fill: '#f0a34a',
              },
            ],
          },
          {
            id: 'stage-1-radar-label',
            type: 'text',
            x: inputCardXs[2] + cardWidth / 2,
            y: cardY + Math.round(cardHeight * 0.82),
            text: '毫米波雷达',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 600,
            fill: '#15315f',
          },
          {
            id: 'stage-1-input-chip',
            type: 'rect',
            x: margin + innerPad,
            y: bodyBottom - Math.round(boxHeight * 0.16),
            width: boxWidth - innerPad * 2,
            height: Math.round(boxHeight * 0.13),
            rx: 7,
            style: 'stage-chip',
          },
          {
            id: 'stage-1-input-chip-label',
            type: 'text',
            x: margin + boxWidth / 2,
            y: bodyBottom - Math.round(boxHeight * 0.07),
            text: '同步输入  ·  RGB / LiDAR / Radar',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 600,
            fill: '#15315f',
          },
        ],
      });
    }

    if (index === 1) {
      const fusionX = x + Math.round(boxWidth * 0.5);
      const fusionY = cardY + Math.round(cardHeight * 0.52);
      elements.push({
        id: 'stage-2-content',
        type: 'group',
        children: [
          ...['Fcam', 'Flidar', 'Fradar'].map((name, featureIndex) => ({
            id: `stage-2-feature-${featureIndex + 1}`,
            type: 'rect',
            x: x + innerPad,
            y: cardY + featureIndex * Math.round(cardHeight * 0.29),
            width: Math.round(boxWidth * 0.31),
            height: Math.round(cardHeight * 0.19),
            rx: 5,
            style: featureIndex === 1 ? 'feature-orange' : 'feature-blue',
          })),
          ...['Fcam', 'Flidar', 'Fradar'].map((name, featureIndex) => ({
            id: `stage-2-feature-label-${featureIndex + 1}`,
            type: 'text',
            x: x + innerPad + Math.round(boxWidth * 0.155),
            y: cardY + featureIndex * Math.round(cardHeight * 0.29) + Math.round(cardHeight * 0.13),
            text: name,
            'text-anchor': 'middle',
            'font-family': 'Arial, Helvetica, sans-serif',
            'font-size': smallSize,
            'font-weight': 700,
            fill: '#15315f',
          })),
          {
            id: 'stage-2-fusion-node',
            type: 'circle',
            cx: fusionX,
            cy: fusionY,
            r: Math.round(boxWidth * 0.12),
            style: 'fusion-node',
          },
          {
            id: 'stage-2-fusion-node-label',
            type: 'text',
            x: fusionX,
            y: fusionY + Math.round(smallSize * 0.35),
            text: '时空融合',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 700,
            fill: '#ffffff',
          },
          ...[0, 1, 2].map((featureIndex) => ({
            id: `stage-2-feature-arrow-${featureIndex + 1}`,
            type: 'line',
            x1: x + Math.round(boxWidth * 0.31) + innerPad,
            y1: cardY + featureIndex * Math.round(cardHeight * 0.29) + Math.round(cardHeight * 0.095),
            x2: fusionX - Math.round(boxWidth * 0.12),
            y2: fusionY,
            style: 'inner-arrow',
            'arrow-end': true,
          })),
          {
            id: 'stage-2-output-arrow',
            type: 'line',
            x1: fusionX + Math.round(boxWidth * 0.12),
            y1: fusionY,
            x2: x + boxWidth - innerPad,
            y2: fusionY,
            style: 'inner-arrow',
            'arrow-end': true,
          },
          {
            id: 'stage-2-output-chip',
            type: 'rect',
            x: x + Math.round(boxWidth * 0.67),
            y: fusionY - Math.round(cardHeight * 0.15),
            width: Math.round(boxWidth * 0.24),
            height: Math.round(cardHeight * 0.3),
            rx: 6,
            style: 'stage-chip',
          },
          {
            id: 'stage-2-output-label',
            type: 'text',
            x: x + Math.round(boxWidth * 0.79),
            y: fusionY + Math.round(smallSize * 0.35),
            text: '融合特征',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 600,
            fill: '#15315f',
          },
          {
            id: 'stage-2-note',
            type: 'text',
            x: x + boxWidth / 2,
            y: bodyBottom,
            text: '时间对齐  ·  注意力加权  ·  特征压缩',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            fill: '#4b6383',
          },
        ],
      });
    }

    if (index === 2) {
      const mapX = x + innerPad;
      const mapY = cardY;
      const mapWidth = Math.round(boxWidth * 0.56);
      const mapHeight = Math.round(cardHeight * 0.94);
      const mapGrid = [] as Array<Record<string, unknown>>;
      for (let gridIndex = 1; gridIndex < 4; gridIndex += 1) {
        mapGrid.push({
          id: `stage-3-map-grid-h-${gridIndex}`,
          type: 'line',
          x1: mapX + Math.round(mapWidth * 0.08),
          y1: mapY + Math.round(mapHeight * (gridIndex / 4)),
          x2: mapX + Math.round(mapWidth * 0.92),
          y2: mapY + Math.round(mapHeight * (gridIndex / 4)),
          style: 'map-grid',
        });
        mapGrid.push({
          id: `stage-3-map-grid-v-${gridIndex}`,
          type: 'line',
          x1: mapX + Math.round(mapWidth * (gridIndex / 4)),
          y1: mapY + Math.round(mapHeight * 0.08),
          x2: mapX + Math.round(mapWidth * (gridIndex / 4)),
          y2: mapY + Math.round(mapHeight * 0.92),
          style: 'map-grid',
        });
      }
      elements.push({
        id: 'stage-3-content',
        type: 'group',
        children: [
          {
            id: 'stage-3-map-panel',
            type: 'rect',
            x: mapX,
            y: mapY,
            width: mapWidth,
            height: mapHeight,
            rx: 6,
            style: 'map-panel',
          },
          ...mapGrid,
          {
            id: 'stage-3-trajectory',
            type: 'polyline',
            points: [
              [mapX + Math.round(mapWidth * 0.12), mapY + Math.round(mapHeight * 0.74)],
              [mapX + Math.round(mapWidth * 0.31), mapY + Math.round(mapHeight * 0.66)],
              [mapX + Math.round(mapWidth * 0.46), mapY + Math.round(mapHeight * 0.49)],
              [mapX + Math.round(mapWidth * 0.62), mapY + Math.round(mapHeight * 0.43)],
              [mapX + Math.round(mapWidth * 0.84), mapY + Math.round(mapHeight * 0.2)],
            ],
            style: 'trajectory',
          },
          ...[
            [0.12, 0.74],
            [0.31, 0.66],
            [0.46, 0.49],
            [0.62, 0.43],
            [0.84, 0.2],
          ].map(([dx, dy], pointIndex) => ({
            id: `stage-3-trajectory-point-${pointIndex + 1}`,
            type: 'circle',
            cx: mapX + Math.round(mapWidth * dx),
            cy: mapY + Math.round(mapHeight * dy),
            r: Math.max(4, Math.round(boxWidth * 0.018)),
            fill: pointIndex === 4 ? '#f0a34a' : '#1554b8',
          })),
          {
            id: 'stage-3-map-label',
            type: 'text',
            x: mapX + Math.round(mapWidth * 0.5),
            y: mapY + Math.round(mapHeight * 0.9),
            text: '环境表征 / BEV',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 600,
            fill: '#15315f',
          },
          {
            id: 'stage-3-metric-panel',
            type: 'rect',
            x: x + Math.round(boxWidth * 0.65),
            y: mapY,
            width: Math.round(boxWidth * 0.27),
            height: mapHeight,
            rx: 6,
            style: 'metric-panel',
          },
          {
            id: 'stage-3-metric-title',
            type: 'text',
            x: x + Math.round(boxWidth * 0.785),
            y: mapY + Math.round(mapHeight * 0.24),
            text: '规划输出',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            'font-weight': 700,
            fill: '#15315f',
          },
          {
            id: 'stage-3-metric-value-1',
            type: 'text',
            x: x + Math.round(boxWidth * 0.785),
            y: mapY + Math.round(mapHeight * 0.49),
            text: '轨迹  92%',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            fill: '#2c66c3',
          },
          {
            id: 'stage-3-metric-value-2',
            type: 'text',
            x: x + Math.round(boxWidth * 0.785),
            y: mapY + Math.round(mapHeight * 0.67),
            text: '风险  低',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            fill: '#e1842d',
          },
          {
            id: 'stage-3-metric-value-3',
            type: 'text',
            x: x + Math.round(boxWidth * 0.785),
            y: mapY + Math.round(mapHeight * 0.85),
            text: '控制  稳定',
            'text-anchor': 'middle',
            'font-family': fontFamily,
            'font-size': smallSize,
            fill: '#15315f',
          },
        ],
      });
    }

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
        'fill-opacity': 0.97,
        stroke: '#002FA7',
        'stroke-width': 3,
      },
      'stage-card': {
        fill: '#F4F8FF',
        stroke: '#B8CBEA',
        'stroke-width': 2,
      },
      'stage-chip': {
        fill: '#EAF1FF',
        stroke: '#6D93D4',
        'stroke-width': 2,
      },
      'icon-blue': {
        fill: '#D6E5FF',
        stroke: '#2C66C3',
        'stroke-width': 3,
      },
      'icon-lens': {
        fill: '#15315F',
        stroke: '#6D93D4',
        'stroke-width': 2,
      },
      'icon-line': {
        fill: 'none',
        stroke: '#2C66C3',
        'stroke-width': 3,
        'stroke-linecap': 'round',
      },
      'feature-blue': {
        fill: '#DDEAFF',
        stroke: '#6D93D4',
        'stroke-width': 2,
      },
      'feature-orange': {
        fill: '#FFF0DA',
        stroke: '#E7A35A',
        'stroke-width': 2,
      },
      'fusion-node': {
        fill: '#1554B8',
        stroke: '#8DB5F3',
        'stroke-width': 4,
      },
      'inner-arrow': {
        stroke: '#4776C6',
        'stroke-width': 3,
        'stroke-linecap': 'round',
      },
      'map-panel': {
        fill: '#F4F8FF',
        stroke: '#AFC7ED',
        'stroke-width': 2,
      },
      'map-grid': {
        stroke: '#C7D8F3',
        'stroke-width': 1.5,
      },
      trajectory: {
        fill: 'none',
        stroke: '#1554B8',
        'stroke-width': 5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      'metric-panel': {
        fill: '#FAFCFF',
        stroke: '#AFC7ED',
        'stroke-width': 2,
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
  const ids: string[] = [];
  const visit = (element: Record<string, unknown>) => {
    if (element.id !== undefined) ids.push(String(element.id));
    if (Array.isArray(element.children)) {
      element.children.forEach((child) => visit(child as Record<string, unknown>));
    }
  };
  scene.elements.forEach(visit);
  return ids;
}
