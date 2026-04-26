import { useEffect, useRef, useState } from 'react';
import { NotaLoadingStatus } from '@nota.app/web-design/spinner';
import { cn } from '@/lib/utils';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

type PdfJsModalPreviewProps = {
  url: string;
  documentTitle: string;
  className?: string;
  onRenderFailed: () => void;
};

/**
 * Renders PDF pages to canvases (no Chromium PDF extension toolbar).
 * Fails into iframe fallback via onRenderFailed (CORS, corrupt PDF, etc.).
 */
export function PdfJsModalPreview({
  url,
  documentTitle,
  className,
  onRenderFailed,
}: PdfJsModalPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    void (async () => {
      setPhase('loading');
      container.replaceChildren();

      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('fetch failed');
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await getDocument({ data: buf }).promise;
        const frag = document.createDocumentFragment();

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            throw new Error('no canvas context');
          }
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'mb-4 bg-white shadow-sm';
          canvas.setAttribute('aria-label', `${documentTitle} page ${i}`);
          await page.render({ canvasContext: ctx, canvas, viewport }).promise;
          frag.appendChild(canvas);
        }

        if (cancelled) return;
        container.appendChild(frag);
        setPhase('ready');
      } catch {
        if (!cancelled) {
          onRenderFailed();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, documentTitle, onRenderFailed]);

  return (
    <div
      className={cn(
        'flex min-h-[min(80vh,720px)] flex-col overflow-y-auto',
        className,
      )}
    >
      {phase === 'loading' ? (
        <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
          <NotaLoadingStatus label="Loading preview…" />
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="flex flex-col items-center px-4 pb-4 pt-2"
        hidden={phase !== 'ready'}
      />
    </div>
  );
}
