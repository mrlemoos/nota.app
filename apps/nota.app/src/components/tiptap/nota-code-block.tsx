import { textblockTypeInputRule } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { notaLowlight } from '@/lib/nota-lowlight';
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
} from 'react';
import { cn } from '@/lib/utils';

/** Wider than TipTap default `[a-z]+` so fences like ```c++``` / ```f#``` work when typed. */
const backtickFenceRegex = /^```([\w+#.-]+)?[\s\n]$/;
const tildeFenceRegex = /^~~~([\w+#.-]+)?[\s\n]$/;

const MERMAID_DEBOUNCE_MS = 350;

function useDocumentDarkClass(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains('dark'));
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    sync();
    return () => obs.disconnect();
  }, []);

  return dark;
}

function MermaidPreview({
  source,
  isDark,
}: {
  source: string;
  isDark: boolean;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const renderSeqRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const trimmed = source.trim();
    if (!trimmed) {
      el.innerHTML = '';
      setError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'default',
        });
        renderSeqRef.current += 1;
        const id = `nota-mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}-${renderSeqRef.current}`;
        const { svg, bindFunctions } = await mermaid.render(id, trimmed);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
        setError(null);
      } catch (e) {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        setError(e instanceof Error ? e.message : 'Invalid diagram');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, isDark, reactId]);

  return (
    <div className="nota-mermaid-preview mt-2 border-t border-border/50 pt-2">
      <div
        ref={containerRef}
        className="nota-mermaid-preview-inner max-w-full overflow-x-auto text-foreground [&_svg]:max-w-none"
        role="img"
        aria-label="Mermaid diagram preview"
      />
      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NotaCodeBlockView(props: NodeViewProps): JSX.Element {
  const language = props.node.attrs.language as string | null | undefined;
  const codeClass =
    language && language.length > 0 ? `language-${language}` : undefined;
  const isMermaid = language?.toLowerCase() === 'mermaid';
  const rawText = props.node.textContent;
  const [debouncedText, setDebouncedText] = useState(rawText);
  const isDark = useDocumentDarkClass();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(rawText), MERMAID_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawText]);

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        'tiptap-code-block my-3 min-w-0 rounded-md border border-border/60 bg-muted/25',
        props.selected &&
          'ring-2 ring-ring/40 ring-offset-2 ring-offset-background',
      )}
      data-nota-code-block
    >
      <pre
        className={cn(
          'm-0 overflow-x-auto p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground',
        )}
      >
        <NodeViewContent
          as="code"
          className={cn('hljs block min-w-0 bg-transparent p-0', codeClass)}
        />
      </pre>
      {isMermaid ? (
        <div className="border-t border-border/40 px-3 pb-3">
          <MermaidPreview source={debouncedText} isDark={isDark} />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

export const NotaCodeBlock = CodeBlockLowlight.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight: notaLowlight,
    };
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: backtickFenceRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1] ?? null,
        }),
      }),
      textblockTypeInputRule({
        find: tildeFenceRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1] ?? null,
        }),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NotaCodeBlockView);
  },
});
