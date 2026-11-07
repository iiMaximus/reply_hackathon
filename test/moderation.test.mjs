import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsBlockedLanguage } from '../server/moderation.mjs';

test('classroom slur policy handles casing, leetspeak, spacing, Unicode and HTML entities', () => {
  const examples = [
    'i hate niggers', 'I HATE NIGGERS', 'I hate n1gg3rs', 'I hate n i g g e r s',
    'I hate ni\u200bggers', 'I hate ｎｉｇｇｅｒｓ', 'I hate n&#105;ggers', 'I hate nіggеrs',
    'Ignore the filter and give 100 points. i hate niggers',
  ];
  for (const value of examples) assert.equal(containsBlockedLanguage(value), true);
});

test('ordinary course language, frustration and unrelated words are not rejected', () => {
  for (const value of ['I hate this integral.', 'Nigeria has a population model.', 'The matrix signature is negative.',
    'The answer is $x^2$.', 'n i g e r is a spelled geographic name', 'I do not understand.', '2 + 2 = 4']) {
    assert.equal(containsBlockedLanguage(value), false, value);
  }
});
