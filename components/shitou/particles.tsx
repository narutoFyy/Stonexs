'use client';

import React, { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

interface ParticlesProps extends ComponentPropsWithoutRef<'div'> {
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character + character)
          .join('')
      : normalized,
    16,
  );

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function Particles({
  className,
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = '#ffffff',
  vx = 0,
  vy = 0,
  ...props
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !container || !context) return;

    const [red, green, blue] = hexToRgb(color);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mouse = { x: 0, y: 0 };
    const dimensions = { width: 0, height: 0, dpr: 1 };
    let circles: Circle[] = [];
    let animationFrame: number | null = null;

    const createCircle = (): Circle => ({
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      translateX: 0,
      translateY: 0,
      size: Math.random() * 1.5 + size,
      alpha: reducedMotion.matches ? Math.random() * 0.45 + 0.12 : 0,
      targetAlpha: Math.random() * 0.48 + 0.12,
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: Math.random() * 3.9 + 0.1,
    });

    const draw = () => {
      context.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
      context.clearRect(0, 0, dimensions.width, dimensions.height);

      for (const circle of circles) {
        context.beginPath();
        context.arc(circle.x + circle.translateX, circle.y + circle.translateY, circle.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${circle.alpha})`;
        context.fill();
      }
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dimensions.width = Math.max(1, Math.round(rect.width));
      dimensions.height = Math.max(1, Math.round(rect.height));
      dimensions.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(dimensions.width * dimensions.dpr);
      canvas.height = Math.round(dimensions.height * dimensions.dpr);
      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;
      circles = Array.from({ length: quantity }, createCircle);
      draw();
    };

    const animate = () => {
      for (const circle of circles) {
        circle.alpha = Math.min(circle.targetAlpha, circle.alpha + 0.012);
        circle.x += circle.dx + vx;
        circle.y += circle.dy + vy;
        circle.translateX += (mouse.x / (staticity / circle.magnetism) - circle.translateX) / ease;
        circle.translateY += (mouse.y / (staticity / circle.magnetism) - circle.translateY) / ease;

        if (
          circle.x < -circle.size ||
          circle.x > dimensions.width + circle.size ||
          circle.y < -circle.size ||
          circle.y > dimensions.height + circle.size
        ) {
          Object.assign(circle, createCircle());
        }
      }

      draw();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      resize();
      if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left - rect.width / 2;
      mouse.y = event.clientY - rect.top - rect.height / 2;
    };

    const resizeObserver = new ResizeObserver(start);
    resizeObserver.observe(container);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    reducedMotion.addEventListener('change', start);
    start();

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      reducedMotion.removeEventListener('change', start);
    };
  }, [color, ease, quantity, refresh, size, staticity, vx, vy]);

  return (
    <div ref={containerRef} className={cn('pointer-events-none', className)} aria-hidden="true" {...props}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
