import type { Json } from '~/types/database.types';

export const WELCOME_NOTE_TITLE = 'Welcome to Nota';

/**
 * TipTap JSON for the seeded welcome note. Uses only StarterKit-style nodes
 * (headings, paragraphs, bullet lists, bold) — matches the live editor schema.
 */
export const WELCOME_NOTE_CONTENT: Json = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'This is your vault: notes live on your device first, so you can think and write without friction.',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Nota Pro ',
        },
        {
          type: 'text',
          marks: [{ type: 'bold' }],
          text: 'adds cloud sync, backup, and cross-device access',
        },
        {
          type: 'text',
          text: ' when you are online. You can manage your plan from Settings whenever you are ready.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Things to try' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Command palette' },
                {
                  type: 'text',
                  text: ' — Press ⌘K to jump to a note, create one, or sign out.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Sidebar' },
                {
                  type: 'text',
                  text: ' — Press ⌘S to toggle the note list sidebar.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: "Optional ",
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: "today's note",
                },
                {
                  type: 'text',
                  text: ' shortcut (⌘D) — turn it on under Settings when you want a dated note for the day.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Type ',
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: '@',
                },
                {
                  type: 'text',
                  text: ' in the body to link to another note from a filterable menu.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Insert ',
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'tables',
                },
                {
                  type: 'text',
                  text: ' and emoji from the command palette; use headings and lists to structure longer notes.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Paste or drag a URL on its own line to fetch a ',
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'link preview',
                },
                {
                  type: 'text',
                  text: ' when the page offers useful metadata.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Open ',
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'Note graph',
                },
                {
                  type: 'text',
                  text: ' in the sidebar to see how notes connect; each note can show ',
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'backlinks',
                },
                {
                  type: 'text',
                  text: ' to notes that link here.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'With Nota Pro, drag in ',
                },
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'PDFs and images',
                },
                {
                  type: 'text',
                  text: ' so they sit inline in your document.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Delete this note whenever you like — your vault is yours.',
        },
      ],
    },
  ],
} as Json;
