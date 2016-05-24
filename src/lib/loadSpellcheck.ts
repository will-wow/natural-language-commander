import natural = require('natural');
import _ = require('lodash');
import fs = require('fs');
import promise = require('es6-promise');

import Deferred from './Deferred';

/** The deferred promise, resolved with the spellchecker. */
let deferred: Deferred;

/** Load the spellchecker. */
function loadSpellcheck(): void {
  deferred = new Deferred();
  
  // Parse some text for the spellchecker.
  fs.readFile('./src/lib/big.txt', (error: any, data: any) => {
    if (error) {
      console.log('Spellcheck load error!', error);
      deferred.reject(error);
      return;
    }

    const words = _.words(data.toString().toLocaleLowerCase());
    process.nextTick(() => {
      const spellcheck: natural.Spellcheck = new natural.Spellcheck(words);
      console.log('spellcheck ready!');

      deferred.resolve(spellcheck);
    });
  });
}



export default function (): promise.Promise<natural.Spellcheck> {
  // Start loading the spellchecker, if we havn't already.
  if (!deferred) {
    loadSpellcheck();
  }
  
  return deferred.promise;
}

