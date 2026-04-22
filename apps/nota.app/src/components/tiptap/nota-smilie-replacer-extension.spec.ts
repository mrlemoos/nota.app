import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setNotaSmilieReplacerEnabled } from '../../lib/nota-smilie-replacer-gate';
import { NotaCodeBlock } from './nota-code-block';
import { NotaSmilieReplacer } from './nota-smilie-replacer-extension';

function flushInputRuleMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createEditorWithSmilieReplacer(): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      NotaCodeBlock,
      NotaSmilieReplacer,
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  });
}

describe('NotaSmilieReplacer', () => {
  beforeEach(() => {
    setNotaSmilieReplacerEnabled(true);
  });

  afterEach(() => {
    setNotaSmilieReplacerEnabled(true);
  });

  it('replaces :-) with emoji when the gate is enabled', async () => {
    // Arrange
    const gateEnabled = true;
    setNotaSmilieReplacerEnabled(gateEnabled);
    const editor = createEditorWithSmilieReplacer();
    const smilieText = ':-) ';
    const insertOptions = { applyInputRules: true };

    // Act
    editor.chain().focus('end').insertContent(smilieText, insertOptions).run();
    await flushInputRuleMacrotask();
    const text = editor.getText();

    // Assert
    expect(text).toContain('🙂');
    editor.destroy();
  });

  it('does not replace when the gate is disabled', async () => {
    // Arrange
    const gateEnabled = false;
    setNotaSmilieReplacerEnabled(gateEnabled);
    const editor = createEditorWithSmilieReplacer();
    const smilieText = ':-) ';
    const insertOptions = { applyInputRules: true };

    // Act
    editor.chain().focus('end').insertContent(smilieText, insertOptions).run();
    await flushInputRuleMacrotask();
    const text = editor.getText();

    // Assert
    expect(text).toContain(':-)');
    expect(text).not.toContain('🙂');

    editor.destroy();
  });
});
