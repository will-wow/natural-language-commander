import chai = require('chai');

import NLC from '../NaturalLanguageCommander';
import Deferred from '../lib/Deferred';

const expect = chai.expect;


describe('basic commands', () => {
  let deferred: Deferred;
  let nlc: NLC;
  let matched: boolean;
  
  beforeEach(() => {
    nlc = new NLC();
    deferred = new Deferred();
    
    // Register a simple intent.
    nlc.registerIntent({
      intent: 'TEST',
      callback: (): void => {
        matched = true;
        deferred.resolve();
      },
      utterances: [
        'test'
      ]
    });
  });
  
  it('should match a simple input', (done) => {
    nlc.handleCommand('test').catch(() => {
      matched = false;
      deferred.resolve();
    });
    
    deferred.promise.then(() => {
      expect(matched).to.be.true;
      done();
    });
  });
  
  it('should not match a simple bad input', (done) => {
    nlc.handleCommand('tset').catch(() => {
      matched = false;
      deferred.resolve();
    });
    
    deferred.promise.then(() => {
      expect(matched).to.be.false;
      done();
    });
  });
});