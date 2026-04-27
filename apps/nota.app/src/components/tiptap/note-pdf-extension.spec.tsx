// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ReactNodeViewContext, type NodeViewProps } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteAttachment } from '~/types/database.types';
import {
  type NotePdfDocContextValue,
  NotePdfDocProvider,
  NotePdfNodeView,
} from './note-pdf-extension';

vi.mock('../../lib/note-attachment-signed-url-cache', () => ({
  getValidNoteAttachmentSignedUrlCacheEntry: vi.fn(() => ({
    signedUrl: 'https://example.com/report.pdf',
    storagePath: 'user-1/att-1/report.pdf',
    expiresAtMs: Date.now() + 60_000,
  })),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      getPage: vi.fn(async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 200 * scale,
          height: 280 * scale,
        }),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
    }),
  })),
}));

function renderWithTipTap(
  nodeView: ReactElement,
  ctx: NotePdfDocContextValue,
) {
  return render(
    <ReactNodeViewContext.Provider
      value={{ onDragStart: () => {}, nodeViewContentRef: () => {} }}
    >
      <NotePdfDocProvider value={ctx}>{nodeView}</NotePdfDocProvider>
    </ReactNodeViewContext.Provider>,
  );
}

const baseAttachment = (id: string, filename: string): NoteAttachment => ({
  id,
  note_id: 'note-1',
  user_id: 'user-1',
  storage_path: `user-1/${id}/report.pdf`,
  filename,
  content_type: 'application/pdf',
  size_bytes: 100,
  created_at: new Date().toISOString(),
});

describe('NotePdfNodeView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })) as never,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {
        clearRect: () => {},
      } as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a front-page thumbnail and stacked sheets with hover/focus classes', async () => {
    // Arrange
    const attId = 'att-1';
    const noteId = 'note-1';
    const userId = 'user-1';
    const filename = 'report.pdf';
    const isSelected = false;
    const att = baseAttachment(attId, filename);
    const ctx: NotePdfDocContextValue = {
      noteId,
      userId,
      attachmentsById: new Map([[attId, att]]),
      revalidate: () => {},
    };
    const props = {
      node: { attrs: { attachmentId: attId, filename } },
      selected: isSelected,
      deleteNode: vi.fn(),
      updateAttributes: vi.fn(),
    } as unknown as NodeViewProps;

    // Act
    renderWithTipTap(<NotePdfNodeView {...props} />, ctx);

    // Assert
    const stack = screen.getByTestId('note-pdf-stack');
    expect(stack.tagName).toBe('BUTTON');
    expect(screen.queryByText('PDF')).toBeNull();
    expect(screen.queryByText('Page 1')).toBeNull();

    const sheets = screen.getByTestId('note-pdf-stack-sheets');
    const [backSheet, midSheet, frontSheet] = Array.from(
      sheets.children,
    ) as HTMLElement[];

    expect(backSheet.className).toContain('group-hover:rotate-[9deg]');
    expect(backSheet.className).toContain('group-focus-within:rotate-[9deg]');
    expect(midSheet.className).toContain('group-hover:rotate-[6deg]');
    expect(frontSheet.className).toContain('group-hover:rotate-[3deg]');

    await waitFor(() => {
      const canvas = screen
        .getByTestId('note-pdf-thumbnail')
        .querySelector('canvas');

      expect(canvas?.getAttribute('aria-label')).toBe('report.pdf front page');
    });
  });
});
