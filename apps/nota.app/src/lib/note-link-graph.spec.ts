import { describe, expect, it } from 'vitest';
import {
  buildNoteLinkGraph,
  extractOutgoingNoteIdsFromContent,
} from './note-link-graph';
import type { Json, Note } from '~/types/database.types';

const NOTE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOTE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function minimalNote(overrides: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    user_id: 'u',
    title: '',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
    due_at: null,
    is_deadline: false,
    editor_settings: {},
    ...overrides,
  };
}

describe('extractOutgoingNoteIdsFromContent', () => {
  it('collects targets from link marks on text', () => {
    // Arrange
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'See other',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: `/notes/${NOTE_B}`,
                    target: '_blank',
                    class: 'tiptap-link',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    // Act
    const ids = extractOutgoingNoteIdsFromContent(content);

    // Assert
    expect(ids.sort()).toEqual([NOTE_B]);
  });

  it('dedupes repeated links to the same note', () => {
    // Arrange
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'a',
              marks: [
                { type: 'link', attrs: { href: `/notes/${NOTE_B}` } },
              ],
            },
            {
              type: 'text',
              text: 'b',
              marks: [
                { type: 'link', attrs: { href: `/notes/${NOTE_B}` } },
              ],
            },
          ],
        },
      ],
    };

    // Act
    const ids = extractOutgoingNoteIdsFromContent(content);

    // Assert
    expect(ids).toEqual([NOTE_B]);
  });

  it('reads internal hrefs on linkPreview attrs', () => {
    // Arrange
    const content = {
      type: 'doc',
      content: [
        {
          type: 'linkPreview',
          attrs: {
            href: `/notes/${NOTE_B}`,
            linkText: '',
            title: '',
            description: '',
            image: '',
          },
        },
      ],
    };

    // Act
    const ids = extractOutgoingNoteIdsFromContent(content);

    // Assert
    expect(ids).toEqual([NOTE_B]);
  });

  it('ignores non-internal hrefs', () => {
    // Arrange
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [
                { type: 'link', attrs: { href: 'https://example.com' } },
              ],
            },
          ],
        },
      ],
    };

    // Act
    const ids = extractOutgoingNoteIdsFromContent(content);

    // Assert
    expect(ids).toEqual([]);
  });
});

describe('buildNoteLinkGraph', () => {
  it('builds outgoing and backlinks for two notes', () => {
    // Arrange
    const noteA = minimalNote({
      id: NOTE_A,
      title: 'Alpha',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'link',
                marks: [
                  { type: 'link', attrs: { href: `/notes/${NOTE_B}` } },
                ],
              },
            ],
          },
        ],
      },
    });
    const noteB = minimalNote({
      id: NOTE_B,
      title: 'Beta',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });

    // Act
    const { outgoing, backlinks } = buildNoteLinkGraph([noteA, noteB]);

    // Assert
    expect([...(outgoing.get(NOTE_A) ?? [])]).toEqual([NOTE_B]);
    expect([...(outgoing.get(NOTE_B) ?? [])]).toEqual([]);
    expect([...(backlinks.get(NOTE_B) ?? [])]).toEqual([NOTE_A]);
    expect(backlinks.has(NOTE_A)).toBe(false);
  });

  it('omits self-links from outgoing', () => {
    // Arrange
    const note = minimalNote({
      id: NOTE_A,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'self',
                marks: [
                  { type: 'link', attrs: { href: `/notes/${NOTE_A}` } },
                ],
              },
            ],
          },
        ],
      },
    });

    // Act
    const { outgoing } = buildNoteLinkGraph([note]);

    // Assert
    expect([...(outgoing.get(NOTE_A) ?? [])]).toEqual([]);
  });
});
