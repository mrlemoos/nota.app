/** ProseMirror JSON fragment for `editor.commands.insertContent` (Mermaid `codeBlock`). */
export const MERMAID_CODE_BLOCK_INSERT = {
  type: 'codeBlock',
  attrs: { language: 'mermaid' },
  content: [
    {
      type: 'text',
      text: 'graph TD\n  A[Start] --> B[End]',
    },
  ],
} as const;
