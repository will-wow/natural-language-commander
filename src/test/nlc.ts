import chai = require('chai');
const spies = require('chai-spies');

import NLC from '../NaturalLanguageCommander';
import Deferred from '../lib/Deferred';

chai.use(spies);
const expect = chai.expect;

/** Expect a command to get a match. */
function expectCommandToMatch(nlc: NLC, command: string, matchCallback, noMatchCallback, done) {
  nlc.handleCommand(command)
    .catch(noMatchCallback)
    .then(() => {
      expect(matchCallback).to.have.been.called();
      expect(noMatchCallback).not.to.have.been.called();
      done();
    })
    .catch((error) => done(error));
}

/** Expect a command to get a match with paramaters. */
function expectCommandToMatchWith(nlc: NLC, command: string, args: any[], matchCallback, noMatchCallback, done) {
  nlc.handleCommand(command)
    .catch(noMatchCallback)
    .then(() => {
      // Run the expect first to get its this context.
      const expectContext = expect(matchCallback);
      // Pass the args list to with, along with the expect's context, to not break `this`.
      expectContext.to.have.been.called.with.apply(expectContext, args);
      expect(noMatchCallback).not.to.have.been.called();
      done();
    })
    .catch((error) => done(error));
}

/** Expect a command not to get a match. */
function expectCommandNotToMatch(nlc: NLC, command: string, matchCallback, noMatchCallback, done) {
  nlc.handleCommand(command)
    .catch(noMatchCallback)
    .then(() => {
      expect(matchCallback).not.to.have.been.called();
      expect(noMatchCallback).to.have.been.called();
      done();
    })
    .catch((error) => done(error));
}

describe('NLC', () => {
  let nlc: NLC;
  let matchCallback;
  let noMatchCallback;

  beforeEach(() => {
    nlc = new NLC();

    matchCallback = chai.spy();
    noMatchCallback = chai.spy();
  });

  describe('basic commands', () => {
    beforeEach(() => {
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
      expectCommandToMatch(nlc, 'test', matchCallback, noMatchCallback, done);
    });

    it('should not match a simple bad input', (done) => {
      expectCommandNotToMatch(nlc, 'tset', matchCallback, noMatchCallback, done);
    });
  });

  describe('slot types', () => {
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
        expectCommandToMatch(nlc, 'test this is a string test', matchCallback, noMatchCallback, done);
      });

      it('should not match a bad string slot', (done) => {
        expectCommandNotToMatch(nlc, 'test test', matchCallback, noMatchCallback, done);
      });
    });

    describe('DATE', () => {
      beforeEach(() => {
        // Register an intent with a DATE.
        nlc.registerIntent({
          intent: 'DATE_TEST',
          callback: matchCallback,
          slots: [
            {
              name: 'Date',
              type: 'DATE'
            }
          ],
          utterances: [
            'test {Date} test'
          ]
        });
      });

      it('should match a date slot with a MM/DD/YYYY date', (done) => {
        expectCommandToMatch(nlc, 'test 10/10/2016 test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with a YYYY-MM-DD date', (done) => {
        expectCommandToMatch(nlc, 'test 2016-10-10 test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with a MMM DD, YYYY date', (done) => {
        expectCommandToMatch(nlc, 'test Oct 10, 2016 test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with a MMMM DD, YYYY date', (done) => {
        expectCommandToMatch(nlc, 'test October 10, 2016 test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with "today"', (done) => {
        expectCommandToMatch(nlc, 'test today test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with "tomorrow"', (done) => {
        expectCommandToMatch(nlc, 'test tomorrow test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with "yesterday"', (done) => {
        expectCommandToMatch(nlc, 'test yesterday test', matchCallback, noMatchCallback, done);
      });

      it('should match a date slot with other strings', (done) => {
        expectCommandNotToMatch(nlc, 'test foobar test', matchCallback, noMatchCallback, done);
      });
    });

    describe('SLACK_NAME', () => {
      beforeEach(() => {
        // Register an intent with a SLACK_NAME.
        nlc.registerIntent({
          intent: 'SLACK_NAME_TEST',
          callback: matchCallback,
          slots: [
            {
              name: 'Name',
              type: 'SLACK_NAME'
            }
          ],
          utterances: [
            'test {Name} test'
          ]
        });
      });

      it('should match a name slot', (done) => {
        expectCommandToMatch(nlc, 'test @test test', matchCallback, noMatchCallback, done);
      });

      it('should not match a bad name slot', (done) => {
        expectCommandNotToMatch(nlc, 'test test test', matchCallback, noMatchCallback, done);
      });
    });

    describe('SLACK_ROOM', () => {
      beforeEach(() => {
        // Register an intent with a SLACK_ROOM.
        nlc.registerIntent({
          intent: 'SLACK_ROOM_TEST',
          callback: matchCallback,
          slots: [
            {
              name: 'Room',
              type: 'SLACK_ROOM'
            }
          ],
          utterances: [
            'test {Room} test'
          ]
        });
      });

      it('should match a room slot', (done) => {
        expectCommandToMatch(nlc, 'test #test test', matchCallback, noMatchCallback, done);
      });

      it('should match a name slot', (done) => {
        expectCommandToMatch(nlc, 'test @test test', matchCallback, noMatchCallback, done);
      });

      it('should not match a bad room slot', (done) => {
        expectCommandNotToMatch(nlc, 'test test test', matchCallback, noMatchCallback, done);
      });
    });
  });

  describe('multiple slots', () => {
    it('should not collide when the first is a single word', (done) => {
      nlc.registerIntent({
        intent: 'COLLISION_TEST',
        callback: matchCallback,
        slots: [
          {
            name: 'Name',
            type: 'SLACK_NAME'
          },
          {
            name: 'String',
            type: 'STRING'
          }
        ],
        utterances: [
          'test {Name} {String} test'
        ]
      });

      expectCommandToMatchWith(
        nlc,
        'test @name some more stuff test',
        ['@name', 'some more stuff'],
        matchCallback,
        noMatchCallback,
        done
      );
    });
  });
  
  describe('common mispellings', () => {
    it('should be caught', (done) => {
      const GOOD_DEFINITELY = 'definitely';
      const BAD_DEFINITELY = 'definately';
      
      nlc.registerIntent({
        intent: 'SPELLING_TEST',
        callback: matchCallback,
        utterances: [
          `test ${GOOD_DEFINITELY}`
        ]
      });
      
      expectCommandToMatch(nlc, `test ${BAD_DEFINITELY}`, matchCallback, noMatchCallback, done);
    });
  })
});

