import { NotaLoadingStatus } from '@nota.app/web-design/spinner';
import { lazy, Suspense, type JSX } from 'react';

const NotesGraphView = lazy(async () => {
  const m = await import('./notes-graph-view');
  return { default: m.NotesGraphView };
});

export default function NotesGraph(): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4">
        <div>
          <h1 className="font-serif text-xl font-semibold tracking-normal text-foreground">
            Note Graph
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your notes link together. Click a note to open it. Pan and zoom
            to explore.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
              <NotaLoadingStatus label="Loading graph…" />
            </div>
          }
        >
          <NotesGraphView />
        </Suspense>
      </div>
    </div>
  );
}
