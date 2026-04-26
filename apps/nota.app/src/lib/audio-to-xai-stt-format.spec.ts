import { describe, expect, it } from 'vitest';
import {
  audioBufferToWav,
  shouldPassThroughToXaiStt,
} from './audio-to-xai-stt-format';

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve(reader.result as ArrayBuffer); };
    reader.onerror = () => {
      reject(
        reader.error instanceof Error
          ? reader.error
          : new Error('FileReader failed'),
      );
    };
    reader.readAsArrayBuffer(blob);
  });
}

describe('shouldPassThroughToXaiStt', () => {
  it('allows only wav and mp3 family', () => {
    // Arrange
    const wav = 'audio/wav';
    const mpeg = 'audio/mpeg';
    const mp3 = 'audio/mp3';

    // Act
    const wavOk = shouldPassThroughToXaiStt(wav);
    const mpegOk = shouldPassThroughToXaiStt(mpeg);
    const mp3Ok = shouldPassThroughToXaiStt(mp3);

    // Assert
    expect(wavOk).toBe(true);
    expect(mpegOk).toBe(true);
    expect(mp3Ok).toBe(true);
  });

  it('does not pass through Ogg/Opus from MediaRecorder (transcode to WAV)', () => {
    // Arrange
    const oggOpus = 'audio/ogg;codecs=opus';
    const ogg = 'audio/ogg';
    const webmOpus = 'audio/webm;codecs=opus';
    const mp4 = 'audio/mp4';

    // Act
    const oggOpusOk = shouldPassThroughToXaiStt(oggOpus);
    const oggOk = shouldPassThroughToXaiStt(ogg);
    const webmOk = shouldPassThroughToXaiStt(webmOpus);
    const mp4Ok = shouldPassThroughToXaiStt(mp4);

    // Assert
    expect(oggOpusOk).toBe(false);
    expect(oggOk).toBe(false);
    expect(webmOk).toBe(false);
    expect(mp4Ok).toBe(false);
  });
});

describe('audioBufferToWav', () => {
  it('produces audio/wav with RIFF header', async () => {
    // Arrange
    const ch0 = new Float32Array(8).fill(0);
    const buf = {
      length: 8,
      numberOfChannels: 1,
      sampleRate: 48_000,
      getChannelData: (c: number): Float32Array => {
        if (c !== 0) {
          throw new Error('unexpected channel');
        }
        return ch0;
      },
    } as unknown as AudioBuffer;

    // Act
    const blob = audioBufferToWav(buf);
    const ab = await blobToArrayBuffer(blob);

    // Assert
    expect(blob.type).toBe('audio/wav');
    expect(new TextDecoder().decode(ab.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(ab.slice(8, 12))).toBe('WAVE');
  });
});
