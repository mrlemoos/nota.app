import { MarkerType, type Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { applyNoteGraphHoverToEdges } from './note-graph-hover-edges';

function sampleEdges(): Edge[] {
  return [
    {
      id: 'a->b',
      source: 'a',
      target: 'b',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--border)' },
      style: { stroke: 'var(--border)' },
    },
    {
      id: 'b->c',
      source: 'b',
      target: 'c',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--border)' },
      style: { stroke: 'var(--border)' },
    },
  ];
}

describe('applyNoteGraphHoverToEdges', () => {
  it('returns the same array reference when there is no hover', () => {
    // Arrange
    const edges = sampleEdges();

    // Act
    const result = applyNoteGraphHoverToEdges(edges, null);

    // Assert
    expect(result).toBe(edges);
  });

  it('emphasises inbound edges to the hovered note and dims the rest', () => {
    // Arrange
    const edges = sampleEdges();

    // Act
    const result = applyNoteGraphHoverToEdges(edges, 'b');

    // Assert
    const toB = result.find((e) => e.id === 'a->b');
    const fromB = result.find((e) => e.id === 'b->c');
    expect(toB?.style).toMatchObject({
      stroke: 'var(--primary)',
      strokeWidth: 2.5,
      opacity: 1,
    });
    expect(toB?.markerEnd).toMatchObject({
      type: MarkerType.ArrowClosed,
      color: 'var(--primary)',
    });
    expect(fromB?.style).toMatchObject({
      stroke: 'var(--border)',
      opacity: 0.25,
    });
    expect(fromB?.markerEnd).toMatchObject({
      type: MarkerType.ArrowClosed,
      color: 'var(--border)',
    });
  });
});
