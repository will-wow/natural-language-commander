import chai = require('chai');
const spies = require('chai-spies');

import promise = require('es6-promise');
const Promise = promise.Promise;

chai.use(spies);

import NLC from '../NaturalLanguageCommander';
import Deferred from '../lib/Deferred';

const expect = chai.expect;

describe('basic commands', () => {
  let deferred: Deferred;
  let nlc: NLC;
  let matched: boolean;
  let matchCallback;
  let noMatchCallback;
  
  beforeEach(() => {
    nlc = new NLC();
    
    matchCallback = chai.spy();
    noMatchCallback = chai.spy();
    
    // Register a simple intent.
    nlc.registerIntent({
      intent: 'TEST',
      callback: matchCallback,
      utterances: [
        'test'
      ]
    });
  });
  
  it('should match a simple input', (done) => {
    nlc.handleCommand('test')
    .catch(noMatchCallback)
    .then(() => {
      expect(matchCallback).to.have.been.called();
      done();
    })
    .catch((error) => done(error));
  });
  
  it('should not match a simple bad input', (done) => {
    nlc.handleCommand('tset')
    .catch(noMatchCallback)
    .then(() => {
      expect(matchCallback).not.to.have.been.called();
      done();
    })
    .catch((error) => done(error));
  });
});