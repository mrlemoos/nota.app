import {
  useCallback,
  useEffect,
  useMemo,
  type JSX,
  type MouseEvent,
} from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Note } from '~/types/database.types';
import { useNotesDataVault } from '../context/notes-data-context';
import { navigateFromLegacyPath } from '../lib/app-navigation';
import { filterNotesForNoteGraph } from '../lib/note-editor-settings';
import { buildNoteLinkGraph } from '../lib/note-link-graph';
import { notesToIdMap } from '../lib/notes-id-map';
import { cn } from '@/lib/utils';

type NoteNodeData = { label: string };

function NoteGraphNode({ data }: { data: NoteNodeData }): JSX.Element {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-border !bg-muted"
      />
      <div
        className={cn(
          'max-w-[200px] min-w-[120px] truncate rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm',
        )}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-border !bg-muted"
      />
    </>
  );
}

const nodeTypes = { note: NoteGraphNode };

function buildFlowModel(notes: Note[]): { nodes: Node[]; edges: Edge[] } {
  const { outgoing } = buildNoteLinkGraph(notes);
  const idSet = new Set(notesToIdMap(notes).keys());
  const cols = Math.max(1, Math.ceil(Math.sqrt(notes.length)));

  const nodes: Node[] = notes.map((note, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const label = note.title?.trim() ? note.title : 'Untitled Note';
    return {
      id: note.id,
      type: 'note',
      position: { x: col * 240, y: row * 130 },
      data: { label },
    };
  });

  const edges: Edge[] = [];
  for (const note of notes) {
    for (const targetId of outgoing.get(note.id) ?? []) {
      if (!idSet.has(targetId)) continue;
      edges.push({
        id: `${note.id}->${targetId}`,
        source: note.id,
        target: targetId,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--border)' },
        style: { stroke: 'var(--border)' },
      });
    }
  }

  return { nodes, edges };
}

function NotesGraphFlowInner(): JSX.Element {
  const { notes } = useNotesDataVault();

  const visibleNotes = useMemo(
    () => filterNotesForNoteGraph(notes),
    [notes],
  );

  const { nodes: derivedNodes, edges: derivedEdges } = useMemo(
    () => buildFlowModel(visibleNotes),
    [visibleNotes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(derivedNodes);
    setEdges(derivedEdges);
  }, [derivedNodes, derivedEdges, setNodes, setEdges]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 200 });
    });
    return () => cancelAnimationFrame(id);
  }, [derivedNodes, derivedEdges, fitView]);

  const onNodeClick = useCallback((_event: MouseEvent, node: Node) => {
    navigateFromLegacyPath(`/notes/${node.id}`);
  }, []);

  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No notes to show.</p>
    );
  }

  if (visibleNotes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Every note is hidden from the graph. Open a note and turn on{' '}
        <span className="font-medium text-foreground">Show in note graph</span>{' '}
        in the note layout menu (typography icon next to the title).
      </p>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      proOptions={{ hideAttribution: true }}
      className="rounded-lg bg-muted/20"
    >
      <Background gap={20} className="!bg-transparent" />
      <Controls className="!border-border !bg-card !text-foreground [&_button]:!border-border [&_button]:!bg-card [&_svg]:!fill-foreground" />
      <MiniMap
        className="!border-border !bg-card"
        maskColor="var(--muted)"
        nodeColor={() => 'var(--muted)'}
      />
    </ReactFlow>
  );
}

export function NotesGraphView(): JSX.Element {
  return (
    <div className="h-[min(70vh,640px)] w-full min-h-[280px] rounded-lg border border-border">
      <ReactFlowProvider>
        <NotesGraphFlowInner />
      </ReactFlowProvider>
    </div>
  );
}
