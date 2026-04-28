import { createLowlight, common } from 'lowlight';
import plaintext from 'highlight.js/lib/languages/plaintext';

const lowlight = createLowlight(common);

lowlight.register('mermaid', plaintext);

export const notaLowlight = lowlight;
