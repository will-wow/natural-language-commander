import chai = require('chai');
const spies = require('chai-spies');

import NLC from '../NaturalLanguageCommander';
import Deferred from '../lib/Deferred';

chai.use(spies);
const expect = chai.expect;

describe('basic commands', () => {
  let nlc: NLC;
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

describe('default slots', () => {
  let nlc: NLC;
  let matchCallback;
  let noMatchCallback;
  
  beforeEach(() => {
    nlc = new NLC();
    
    matchCallback = chai.spy();
    noMatchCallback = chai.spy();
  });
  
  describe('STRING', () => {
    beforeEach(() => {
      // Register an intent with a STRING.
      nlc.registerIntent({
        intent: 'STRING_TEST',
        callback: matchCallback,
        slots: [
          {
            name: 'String',
            type: 'STRING'
          }
        ],
        utterances: [
          'test {String} test'
        ]
      });
    });
    
    it('should match a string slot', (done) => {
      nlc.handleCommand('test this is a string test')
      .catch(noMatchCallback)
      .then(() => {
        expect(matchCallback).to.have.been.called();
        expect(noMatchCallback).not.to.have.been.called();
        done();
      })
      .catch((error) => done(error));
    });
    
    it('should match a string slot', (done) => {
      nlc.handleCommand('test test')
      .catch(noMatchCallback)
      .then(() => {
        expect(matchCallback).not.to.have.been.called();
        expect(noMatchCallback).to.have.been.called();
        done();
      })
      .catch((error) => done(error));
    });
  });
});