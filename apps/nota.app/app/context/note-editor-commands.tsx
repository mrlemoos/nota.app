import type { Editor } from '@tiptap/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MERMAID_CODE_BLOCK_INSERT } from '@/lib/tiptap-mermaid-insert';

type NoteEditorCommandsContextValue = {
  registerMermaidInserter: (fn: (() => void) | null) => void;
  insertMermaidAtCursor: () => void;
  canInsertMermaid: boolean;
  registerTableInserter: (fn: (() => void) | null) => void;
  insertTableAtCursor: () => void;
  canInsertTable: boolean;
};

const NoteEditorCommandsContext =
  createContext<NoteEditorCommandsContextValue | null>(null);

function noopRegister(_fn: (() => void) | null) {}

function noopInsert() {}

const fallbackValue: NoteEditorCommandsContextValue = {
  registerMermaidInserter: noopRegister,
  insertMermaidAtCursor: noopInsert,
  canInsertMermaid: false,
  registerTableInserter: noopRegister,
  insertTableAtCursor: noopInsert,
  canInsertTable: false,
};

export function NoteEditorCommandsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const mermaidFnRef = useRef<(() => void) | null>(null);
  const [hasMermaid, setHasMermaid] = useState(false);
  const tableFnRef = useRef<(() => void) | null>(null);
  const [hasTable, setHasTable] = useState(false);

  const registerMermaidInserter = useCallback((fn: (() => void) | null) => {
    mermaidFnRef.current = fn;
    setHasMermaid(fn != null);
  }, []);

  const insertMermaidAtCursor = useCallback(() => {
    mermaidFnRef.current?.();
  }, []);

  const registerTableInserter = useCallback((fn: (() => void) | null) => {
    tableFnRef.current = fn;
    setHasTable(fn != null);
  }, []);

  const insertTableAtCursor = useCallback(() => {
    tableFnRef.current?.();
  }, []);

  const value = useMemo(
    () =>
      ({
        registerMermaidInserter,
        insertMermaidAtCursor,
        canInsertMermaid: hasMermaid,
        registerTableInserter,
        insertTableAtCursor,
        canInsertTable: hasTable,
      }) satisfies NoteEditorCommandsContextValue,
    [
      registerMermaidInserter,
      insertMermaidAtCursor,
      hasMermaid,
      registerTableInserter,
      insertTableAtCursor,
      hasTable,
    ],
  );

  return (
    <NoteEditorCommandsContext.Provider value={value}>
      {children}
    </NoteEditorCommandsContext.Provider>
  );
}

export function useNoteEditorCommands(): NoteEditorCommandsContextValue {
  const ctx = useContext(NoteEditorCommandsContext);
  return ctx ?? fallbackValue;
}

/** Registers TipTap `insertContent` for Mermaid; clears on unmount or when `editor` is null. */
export function useRegisterNoteEditorMermaidInserter(
  editor: Editor | null,
): void {
  const ctx = useContext(NoteEditorCommandsContext);

  useEffect(() => {
    if (!ctx) return;
    if (!editor) {
      ctx.registerMermaidInserter(null);
      return;
    }
    const run = () => {
      editor.chain().focus().insertContent(MERMAID_CODE_BLOCK_INSERT).run();
    };
    ctx.registerMermaidInserter(run);
    return () => {
      ctx.registerMermaidInserter(null);
    };
  }, [editor, ctx]);
}

/** Registers TipTap `insertTable`; clears on unmount or when `editor` is null. */
export function useRegisterNoteEditorTableInserter(editor: Editor | null): void {
  const ctx = useContext(NoteEditorCommandsContext);

  useEffect(() => {
    if (!ctx) return;
    if (!editor) {
      ctx.registerTableInserter(null);
      return;
    }
    const run = () => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    };
    ctx.registerTableInserter(run);
    return () => {
      ctx.registerTableInserter(null);
    };
  }, [editor, ctx]);
}
