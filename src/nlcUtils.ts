/**
 * Helpful naturalLanguageCommander utilites.
 * @module nlcUtils
 */

import _ = require('lodash');
import natural = require('natural');
import spellcheckLoader from '../spellcheckLoader';

let spellcheck: natural.Spellcheck;

spellcheckLoader.then((spellcheckInstance) => {
  spellcheck = spellcheckInstance;
});

/**
 * Check if some possibly misspelled text could be a word.
 * @param text - The word that could be misspelled.
 * @param word - The word to check against.
 * @returns True if they match.
 */
export function couldBeSpelled(text: string, word: string): boolean {
  // If the text is spelled correctly, good to go.
  if (spellcheck.isCorrect(word)) {
    return true;
  }

  // Get spelling corrections of the text.
  const corrections = spellcheck.getCorrections(text, 1);
  // If the word is one of the possible corrections, success.
  if (_.includes(corrections, word)) {
    return true;
  };

  // Check if the words are phonetically similar.
  return natural.Metaphone.compare(text, word);
}
