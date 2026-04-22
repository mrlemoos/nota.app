/**
 * IPC payloads from the Electron main process tray → renderer (`nota-menubar-action`).
 * Keep in sync with `apps/nota-electron/src/main.ts` send logic.
 */
export type NotaMenubarClipboardPayload =
  | { kind: 'text'; text: string }
  | { kind: 'image'; base64: string; mimeType: 'image/png' };

export type NotaMenubarActionPayload =
  | { kind: 'study-recording' }
  | { kind: 'clipboard-note'; clipboard: NotaMenubarClipboardPayload };

export function isNotaMenubarActionPayload(
  value: unknown,
): value is NotaMenubarActionPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const k = (value as { kind?: unknown }).kind;
  if (k === 'study-recording') {
    return true;
  }
  if (k !== 'clipboard-note') {
    return false;
  }
  const cb = (value as { clipboard?: unknown }).clipboard;
  if (!cb || typeof cb !== 'object') {
    return false;
  }
  const ck = (cb as { kind?: unknown }).kind;
  if (ck === 'text') {
    return typeof (cb as { text?: unknown }).text === 'string';
  }
  if (ck === 'image') {
    const img = cb as { base64?: unknown; mimeType?: unknown };
    return (
      typeof img.base64 === 'string' && img.mimeType === 'image/png'
    );
  }
  return false;
}
