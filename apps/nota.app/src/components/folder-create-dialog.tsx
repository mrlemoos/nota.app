import { useCallback, useId, useState, type JSX } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { NotaButton } from '@nota.app/web-design/button';
import { cn } from '@/lib/utils';
import type { Folder } from '~/types/database.types';
import { useNotaTranslator } from '@/lib/use-nota-translator';
import { getBrowserClient } from '../lib/supabase/browser';
import { createFolder } from '../models/folders';

type FolderCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  insertFolderSorted: (f: Folder) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
  onCreated?: (folder: Folder) => void | Promise<void>;
};

export function FolderCreateDialog({
  open,
  onOpenChange,
  userId,
  insertFolderSorted,
  refreshNotesList,
  onCreated,
}: FolderCreateDialogProps): JSX.Element {
  const titleId = useId();
  const { t } = useNotaTranslator();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback((): void => {
    setName('');
    setError(null);
    setBusy(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean): void => {
      if (!next) {
        reset();
      }
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const onSubmit = useCallback(async (): Promise<void> => {
    if (!userId || busy) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('Enter a folder name.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const client = getBrowserClient();
      const row = await createFolder(client, userId, trimmed);
      insertFolderSorted(row);
      await onCreated?.(row);
      await refreshNotesList({ silent: true });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Failed to create folder.'));
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    insertFolderSorted,
    name,
    onCreated,
    onOpenChange,
    refreshNotesList,
    reset,
    t,
    userId,
  ]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Popup
          className={cn(
            'fixed top-[22%] left-1/2 z-[60] w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-lg border border-border/60 bg-background p-4 text-foreground shadow-lg outline-none',
          )}
          aria-labelledby={titleId}
          >
          <Dialog.Title id={titleId} className="font-medium text-foreground">
            {t('New folder')}
          </Dialog.Title>
          <label className="mt-3 block text-xs text-muted-foreground" htmlFor="nota-new-folder-name">
            {t('Name')}
          </label>
          <input
            id="nota-new-folder-name"
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onSubmit();
              }
            }}
            disabled={busy}
            autoFocus
          />
          {error ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <NotaButton
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                handleOpenChange(false);
              }}
            >
              {t('Cancel')}
            </NotaButton>
            <NotaButton
              type="button"
              variant="default"
              disabled={busy}
              onClick={() => {
                void onSubmit();
              }}
            >
              {busy ? t('Creating…') : t('Create')}
            </NotaButton>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
