import natural = require('natural');
import _ = require('lodash');
import fs = require('fs');

import Deferred from './Deferred';

const deferred: Deferred = new Deferred();

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

export default deferred.promise;

