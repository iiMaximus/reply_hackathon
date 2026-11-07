import { DataSet, RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';
import { decodeHTML } from 'entities';
import { insist } from './access.mjs';

// Explicit classroom slur policy, independent of which model grades the work.
// General profanity/frustration is not treated as evidence of hate speech.
const blockedTerms = new Set(['nigger', 'fag', 'kike', 'chingchong', 'africoon', 'arabush', 'boonga', 'abeed']);
const dataset = new DataSet().addAll(englishDataset)
  .removePhrasesIf(phrase => !blockedTerms.has(phrase.metadata?.originalWord));
const matcher = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });

export function containsBlockedLanguage(value) {
  const normalized = decodeHTML(value).normalize('NFKC').replace(/\p{Default_Ignorable_Code_Point}/gu, '')
    // Join deliberately spelled-out runs, without concatenating normal words.
    .replace(/(?<![\p{L}\p{N}])(?:[\p{L}\p{N}][\s._*-]+){3,}[\p{L}\p{N}](?![\p{L}\p{N}])/gu,
      run => run.replace(/[\s._*-]+/g, ''));
  return matcher.hasMatch(normalized);
}

export function requireAppropriateAnswer(answer) {
  insist(!containsBlockedLanguage(answer), 422,
    'This answer contains discriminatory or hateful language. Remove it and submit a response to the question.');
}
