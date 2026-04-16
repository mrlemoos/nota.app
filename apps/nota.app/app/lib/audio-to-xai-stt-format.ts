/**
 * xAI batch STT (`POST /v1/stt`) documents several containers, but in practice
 * `MediaRecorder` output for MP4/M4A/AAC is often rejected as corrupt; we decode
 * those in the browser and upload PCM WAV (same as WebM).
 */

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let pos = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      pos += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/** Types we send as-is to STT; everything else (WebM, MP4, M4A, …) is decoded to WAV first. */
function isPassThroughSttMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return (
    m.includes('wav') ||
    m.includes('mpeg') ||
    m.includes('mp3') ||
    m.includes('ogg') ||
    m.includes('opus') ||
    m.includes('flac') ||
    m.includes('mkv')
  );
}

/**
 * Returns a Blob suitable for xAI STT (decodes to WAV unless MIME is a known-good pass-through).
 */
export async function ensureBlobForXaiStt(input: Blob): Promise<Blob> {
  const t = (input.type || '').toLowerCase();
  if (isPassThroughSttMime(t)) {
    return input;
  }

  const ctx = new AudioContext();
  try {
    const ab = await input.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
    return audioBufferToWav(audioBuffer);
  } finally {
    void ctx.close();
  }
}

export function filenameForSttUpload(blob: Blob): string {
  const m = (blob.type || '').toLowerCase();
  if (m.includes('wav')) {
    return 'recording.wav';
  }
  if (m.includes('mp4') || m.includes('m4a')) {
    return 'recording.m4a';
  }
  if (m.includes('mpeg') || m.includes('mp3')) {
    return 'recording.mp3';
  }
  if (m.includes('ogg')) {
    return 'recording.ogg';
  }
  return 'recording.bin';
}
