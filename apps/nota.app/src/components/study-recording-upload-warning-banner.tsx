import type { JSX } from 'react';
import { NotaButton } from '@nota.app/web-design/button';
import { cn } from '@/lib/utils';
import { useAudioToNoteSession } from '../stores/audio-to-note-session';

/**
 * Dismissible notice when study-note generation succeeded but the original recording
 * could not be uploaded to storage (dock or pending-drain pipeline).
 */
export function StudyRecordingUploadWarningBanner(): JSX.Element | null {
  const warning = useAudioToNoteSession((s) => s.recordingAttachmentWarning);
  const clear = useAudioToNoteSession((s) => s.setRecordingAttachmentWarning);

  if (!warning) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-auto fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2',
        'rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 shadow-lg backdrop-blur',
        'text-sm text-foreground dark:border-amber-400/30 dark:bg-amber-400/10',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className="min-w-0 flex-1 leading-snug">{warning}</p>
        <NotaButton
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0 self-end sm:self-start"
          onClick={() => clear(null)}
        >
          Dismiss
        </NotaButton>
      </div>
    </div>
  );
}
