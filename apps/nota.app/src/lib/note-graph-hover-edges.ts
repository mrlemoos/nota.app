import { MarkerType, type Edge } from '@xyflow/react';

const BASE_STROKE = 'var(--border)';
const BASE_MARKER = 'var(--border)';
const HIGHLIGHT_STROKE = 'var(--primary)';
const HIGHLIGHT_MARKER = 'var(--primary)';
const HIGHLIGHT_STROKE_WIDTH = 2.5;
const DIM_OPACITY = 0.25;

function baseMarkerFrom(edge: Edge) {
  const m = edge.markerEnd;
  if (m && typeof m === 'object' && 'type' in m) {
    return { ...m, color: BASE_MARKER };
  }
  return { type: MarkerType.ArrowClosed, color: BASE_MARKER };
}

function highlightMarkerFrom(edge: Edge) {
  const m = edge.markerEnd;
  if (m && typeof m === 'object' && 'type' in m) {
    return { ...m, color: HIGHLIGHT_MARKER };
  }
  return { type: MarkerType.ArrowClosed, color: HIGHLIGHT_MARKER };
}

/**
 * Styles edges for note-graph hover: inbound links to `hoveredNoteId` are emphasised;
 * other edges dim. Pass `null` to leave `edges` unchanged.
 */
export function applyNoteGraphHoverToEdges(
  edges: Edge[],
  hoveredNoteId: string | null,
): Edge[] {
  if (!hoveredNoteId) {
    return edges;
  }

  return edges.map((edge) => {
    const inbound = edge.target === hoveredNoteId;
    const prevStyle =
      edge.style && typeof edge.style === 'object' ? edge.style : {};

    if (inbound) {
      return {
        ...edge,
        style: {
          ...prevStyle,
          stroke: HIGHLIGHT_STROKE,
          strokeWidth: HIGHLIGHT_STROKE_WIDTH,
          opacity: 1,
        },
        markerEnd: highlightMarkerFrom(edge),
      };
    }

    return {
      ...edge,
      style: {
        ...prevStyle,
        stroke: BASE_STROKE,
        opacity: DIM_OPACITY,
      },
      markerEnd: baseMarkerFrom(edge),
    };
  });
}
