import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ReactNodeViewContext, type NodeViewProps } from '@tiptap/react';
import { describe, expect, it, vi } from 'vitest';
import type { NoteAttachment } from '~/types/database.types';
import { NoteImageNodeView } from './note-image-extension';
import {
  type NotePdfDocContextValue,
  NotePdfDocProvider,
} from './note-pdf-extension';

vi.mock('../../lib/note-attachment-signed-url-cache', () => ({
  getValidNoteAttachmentSignedUrlCacheEntry: vi.fn(() => ({
    signedUrl: 'https://example.com/signed.png',
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
  storage_path: `user-1/${id}/file.png`,
  filename,
  content_type: 'image/png',
  size_bytes: 100,
  created_at: new Date().toISOString(),
});

describe('NoteImageNodeView', () => {
  it('keeps the signed-in image toolbar classes for hover and focus-within', () => {
    // Arrange
    const attId = 'att-1';
    const noteId = 'note-1';
    const userId = 'user-1';
    const filename = 'photo.png';
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
    } as unknown as NodeViewProps;

    // Act
    renderWithTipTap(<NoteImageNodeView {...props} />, ctx);

    // Assert
    const group = screen.getByTestId('note-image-hover-group');
    expect(group.classList.contains('group')).toBe(true);
    const toolbar = screen.getByTestId('note-image-toolbar');
    expect(toolbar.className).toContain('opacity-0');
    expect(toolbar.className).toContain('group-hover:opacity-100');
    expect(toolbar.className).toContain('group-focus-within:opacity-100');
  });

  it('left-aligns the loaded image and does not use full card chrome on the block', async () => {
    // Arrange
    const attId = 'att-2';
    const noteId = 'note-1';
    const userId = 'user-1';
    const filename = 'wide.png';
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
    } as unknown as NodeViewProps;

    // Act
    const { container } = renderWithTipTap(
      <NoteImageNodeView {...props} />,
      ctx,
    );

    // Assert
    const img = await waitFor(() => screen.getByTestId('note-image-asset'));
    expect(img.classList.contains('w-auto')).toBe(true);
    expect(img.classList.contains('max-w-full')).toBe(true);
    expect(img.classList.contains('object-left')).toBe(true);
    const alignRow = screen.getByTestId('note-image-align-row');
    expect(alignRow.className).toContain('justify-start');
    const wrapper = container.querySelector('.note-image-block');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).not.toContain('bg-muted/20');
    expect(wrapper?.className).not.toContain('overflow-hidden');
  });

  it('centre-aligns the image row when align is centre', async () => {
    // Arrange
    const attId = 'att-centre';
    const noteId = 'note-1';
    const userId = 'user-1';
    const filename = 'pic.png';
    const isSelected = false;
    const att = baseAttachment(attId, filename);
    const ctx: NotePdfDocContextValue = {
      noteId,
      userId,
      attachmentsById: new Map([[attId, att]]),
      revalidate: () => {},
    };
    const props = {
      node: {
        attrs: { attachmentId: attId, filename, align: 'center' },
      },
      selected: isSelected,
      deleteNode: vi.fn(),
    } as unknown as NodeViewProps;

    // Act
    renderWithTipTap(<NoteImageNodeView {...props} />, ctx);

    // Assert
    await waitFor(() => screen.getByTestId('note-image-asset'));
    expect(screen.getByTestId('note-image-align-row').className).toContain(
      'justify-center',
    );
  });

  it('right-aligns the image row when align is right', async () => {
    // Arrange
    const attId = 'att-right';
    const noteId = 'note-1';
    const userId = 'user-1';
    const filename = 'pic.png';
    const isSelected = false;
    const att = baseAttachment(attId, filename);
    const ctx: NotePdfDocContextValue = {
      noteId,
      userId,
      attachmentsById: new Map([[attId, att]]),
      revalidate: () => {},
    };
    const props = {
      node: {
        attrs: { attachmentId: attId, filename, align: 'right' },
      },
      selected: isSelected,
      deleteNode: vi.fn(),
    } as unknown as NodeViewProps;

    // Act
    renderWithTipTap(<NoteImageNodeView {...props} />, ctx);

    // Assert
    await waitFor(() => screen.getByTestId('note-image-asset'));
    expect(screen.getByTestId('note-image-align-row').className).toContain(
      'justify-end',
    );
  });

  it('always shows missing-file controls (not hover-gated)', () => {
    // Arrange
    const noteId = 'note-1';
    const userId = 'user-1';
    const attachmentId = 'unknown';
    const filename = 'gone.png';
    const isSelected = false;
    const ctx: NotePdfDocContextValue = {
      noteId,
      userId,
      attachmentsById: new Map(),
      revalidate: () => {},
    };
    const props = {
      node: { attrs: { attachmentId, filename } },
      selected: isSelected,
      deleteNode: vi.fn(),
    } as unknown as NodeViewProps;

    // Act
    renderWithTipTap(<NoteImageNodeView {...props} />, ctx);

    // Assert
    expect(screen.getByText('File no longer available')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove from note' })).toBeTruthy();
    expect(screen.queryByTestId('note-image-hover-group')).toBeNull();
  });
});
