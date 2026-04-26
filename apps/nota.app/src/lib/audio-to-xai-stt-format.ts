/**
 * xAI STT is picky about containers: WebM, MP4/M4A, and **Ogg/Opus** from
 * `MediaRecorder` often fail sniffing ("Could not detect audio format…") if
 * sent raw. We decode almost everything in the browser and upload **PCM WAV**.
 * Only pre-encoded WAV/MP3 are sent through unchanged.
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

/**
 * Only formats we trust xAI to accept from arbitrary bytes. Do **not** match
 * `audio/ogg;codecs=opus` via broad `.includes('ogg')` — that was passing Ogg
 * through and triggered STT header errors.
 */
export function shouldPassThroughToXaiStt(mime: string): boolean {
  const base = mime.toLowerCase().split(';')[0].trim();
  return (
    base === 'audio/wav' ||
    base === 'audio/x-wav' ||
    base === 'audio/wave' ||
    base === 'audio/mpeg' ||
    base === 'audio/mp3'
  );
}

/**
 * Returns a Blob suitable for xAI STT (decodes to WAV unless MIME is a known-good pass-through).
 */
export async function ensureBlobForXaiStt(input: Blob): Promise<Blob> {
  const t = (input.type || '').toLowerCase();
  if (shouldPassThroughToXaiStt(t)) {
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
  const base = m.split(';')[0].trim();
  if (base === 'audio/wav' || base === 'audio/x-wav' || base === 'audio/wave') {
    return 'recording.wav';
  }
  if (base === 'audio/mpeg' || base === 'audio/mp3') {
    return 'recording.mp3';
  }
  return 'recording.wav';
}
