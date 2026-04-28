import { Extension, InputRule, textInputRule } from '@tiptap/core';
import { notaSmilieReplacerEnabled } from '../../lib/nota-smilie-replacer-gate';
import { NOTA_SMILIE_REPLACEMENTS } from '../../lib/nota-smilie-replacer-rules-data';

function gatedTextInputRule(find: RegExp, replace: string): InputRule {
  const inner = textInputRule({ find, replace });
  const innerHandler = inner.handler;
  return new InputRule({
    find: inner.find,
    handler: (props) => {
      if (!notaSmilieReplacerEnabled()) {
        return null;
      }
      return innerHandler(props);
    },
  });
}

export const NotaSmilieReplacer = Extension.create({
  name: 'notaSmilieReplacer',

  addInputRules() {
    return NOTA_SMILIE_REPLACEMENTS.map(({ find, replace }) =>
      gatedTextInputRule(find, replace),
    );
  },
});
