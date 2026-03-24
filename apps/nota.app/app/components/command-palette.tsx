import { useEffect, useEffectEvent, useState, type JSX } from 'react';
import { useFetcher, useMatches, useNavigate, useParams } from 'react-router';
import type { UIMatch } from 'react-router';
import { Dialog } from '@base-ui/react/dialog';
import { Command } from 'cmdk';
import { cn } from '@/lib/utils';
import type { Note } from '~/types/database.types';

const NOTES_ACTION = '/notes';
const LOGOUT_ACTION = '/logout';

const groupHeadingClassName =
  'px-1 py-1 text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5';

function notesFromMatches(matches: UIMatch[]): Note[] {
  for (const m of matches) {
    const d = m.data;
    if (
      d &&
      typeof d === 'object' &&
      'notes' in d &&
      Array.isArray((d as { notes: unknown }).notes)
    ) {
      return (d as { notes: Note[] }).notes;
    }
  }
  return [];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target.closest('[contenteditable="true"]')) {
    return true;
  }
  if (target.closest('.tiptap-editor')) {
    return true;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.closest('input, textarea, select') !== null;
}

export function CommandPalette(): JSX.Element {
  const [open, setOpen] = useState(false);
  const { noteId } = useParams();
  const navigate = useNavigate();
  const matches = useMatches();
  const notes = notesFromMatches(matches);
  const deleteNoteAction = noteId ? `/notes/${noteId}` : null;
  const fetcher = useFetcher();
  const busy = fetcher.state === 'submitting' || fetcher.state === 'loading';
  const pendingAction = fetcher.formAction ?? '';

  const onKeyDown = useEffectEvent((e: KeyboardEvent): void => {
    if (e.key !== 'k' && e.key !== 'K') {
      return;
    }
    if (!(e.metaKey || e.ctrlKey)) {
      return;
    }

    if (open) {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (isEditableTarget(e.target)) {
      return;
    }

    e.preventDefault();
    setOpen(true);
  });

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0',
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed top-[15%] left-1/2 z-50 w-[min(100vw-2rem,28rem)] -translate-x-1/2',
            'rounded-lg bg-background/55 text-foreground shadow-lg',
            'backdrop-blur-xl backdrop-saturate-150',
            'outline-none',
            'transition-[opacity,transform] data-ending-style:scale-95 data-starting-style:scale-95',
            'data-ending-style:opacity-0 data-starting-style:opacity-0',
          )}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search for a command. Use arrow keys to move, Enter to run.
          </Dialog.Description>
          <Command
            className="overflow-hidden"
            label="Command palette"
            vimBindings={false}
          >
            <Command.Input
              placeholder="Type a command…"
              className={cn(
                'w-full bg-transparent px-3 py-3 text-sm',
                'text-foreground outline-none placeholder:text-muted-foreground',
              )}
            />
            <Command.List className="max-h-72 overflow-y-auto p-1">
              <Command.Group heading="Notes" className={groupHeadingClassName}>
                <Command.Item
                  value="create-note"
                  disabled={busy}
                  keywords={['new', 'add']}
                  onSelect={() => {
                    fetcher.submit(null, {
                      method: 'post',
                      action: NOTES_ACTION,
                    });
                  }}
                  className={cn(
                    'flex cursor-pointer items-center rounded-md px-2 py-2 text-sm',
                    'text-foreground outline-none select-none',
                    'aria-selected:bg-accent aria-selected:text-accent-foreground',
                    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                  )}
                >
                  {busy && pendingAction === NOTES_ACTION
                    ? 'Creating note...'
                    : 'Create new note'}
                </Command.Item>
              </Command.Group>
              {notes.length > 0 ? (
                <Command.Group
                  heading="Open note"
                  className={groupHeadingClassName}
                >
                  {notes.map((note) => (
                    <Command.Item
                      key={note.id}
                      value={`${note.title} ${note.id}`}
                      keywords={[
                        'go',
                        'open',
                        'switch',
                        note.title,
                        note.id.slice(0, 8),
                      ]}
                      onSelect={() => {
                        navigate(`/notes/${note.id}`);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex cursor-pointer items-center rounded-md px-2 py-2 text-sm',
                        'text-foreground outline-none select-none',
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      )}
                    >
                      {note.title || 'Untitled Note'}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              {deleteNoteAction ? (
                <Command.Group
                  heading="This note"
                  className={groupHeadingClassName}
                >
                  <Command.Item
                    value="delete-this-note"
                    disabled={busy}
                    keywords={['remove', 'trash', 'delete note']}
                    onSelect={() => {
                      if (
                        !confirm('Are you sure you want to delete this note?')
                      ) {
                        return;
                      }
                      fetcher.submit(null, {
                        method: 'post',
                        action: deleteNoteAction,
                      });
                      setOpen(false);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center rounded-md px-2 py-2 text-sm',
                      'text-destructive outline-none select-none',
                      'aria-selected:bg-destructive/15 aria-selected:text-destructive',
                      'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                    )}
                  >
                    {busy && pendingAction === deleteNoteAction
                      ? 'Deleting...'
                      : 'Delete this note'}
                  </Command.Item>
                </Command.Group>
              ) : null}
              <Command.Group
                heading="Account"
                className={groupHeadingClassName}
              >
                <Command.Item
                  value="sign-out"
                  disabled={busy}
                  keywords={['logout', 'log out', 'exit']}
                  onSelect={() => {
                    fetcher.submit(null, {
                      method: 'post',
                      action: LOGOUT_ACTION,
                    });
                  }}
                  className={cn(
                    'flex cursor-pointer items-center rounded-md px-2 py-2 text-sm',
                    'text-destructive outline-none select-none',
                    'aria-selected:bg-destructive/15 aria-selected:text-destructive',
                    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
                  )}
                >
                  {busy && pendingAction === LOGOUT_ACTION
                    ? 'Signing out...'
                    : 'Sign out'}
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
          <Dialog.Close
            type="button"
            className="sr-only"
            aria-label="Close command palette"
          >
            Close
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
