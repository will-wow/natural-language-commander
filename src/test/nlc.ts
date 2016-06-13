import _ = require('lodash');
import chai = require('chai');
import chaiSpies = require('chai-spies');

import NLC = require('../NaturalLanguageCommander');
import Deferred from '../lib/Deferred';

chai.use(chaiSpies);
const expect = chai.expect;

describe('NLC', () => {
  let nlc: NLC;
  let matchCallback;
  let noMatchCallback;

  /** Expect a command to get a match. */
  function expectCommandToMatch(command: string, done) {
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
  function expectCommandToMatchWith(command: string, args: any[], done) {
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
  function expectCommandNotToMatch(command: string, done) {
    nlc.handleCommand(command)
      .catch(noMatchCallback)
      .then(() => {
        expect(matchCallback).not.to.have.been.called();
        expect(noMatchCallback).to.have.been.called();
        done();
      })
      .catch((error) => done(error));
  }

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
      expectCommandToMatch('test', done);
    });

    it('should not match a simple bad input', (done) => {
      expectCommandNotToMatch('tset', done);
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
        expectCommandToMatch('test this is a string test', done);
      });

      it('should not match a bad string slot', (done) => {
        expectCommandNotToMatch('test test', done);
      });
    });

    describe('WORD', () => {
      beforeEach(() => {
        // Register an intent with a WORD.
        nlc.registerIntent({
          intent: 'WORD_TEST',
          callback: matchCallback,
          slots: [
            {
              name: 'Word',
              type: 'WORD'
            }
          ],
          utterances: [
            'test {Word} test'
          ]
        });
      });

      it('should match a single word', (done) => {
        expectCommandToMatch('test test test', done);
      });

      it('should not match multiple words', (done) => {
        expectCommandNotToMatch('test too many test test', done);
      });
    });

    describe('NUMBER', () => {
      beforeEach(() => {
        // Register an intent with a NUMBER.
        nlc.registerIntent({
          intent: 'NUMBER_TEST',
          callback: matchCallback,
          slots: [
            {
              name: 'Number',
              type: 'NUMBER'
            }
          ],
          utterances: [
            `it's over {Number}!!!`
          ]
        });
      });

      it('should match a number', (done) => {
        expectCommandToMatch(`it's over 9000!!!`, done);
      });

      it('should match a number with commas', (done) => {
        expectCommandToMatch(`it's over 9,000!!!`, done);
      });
      
      it('should match a number with decimals', (done) => {
        expectCommandToMatch(`it's over 9,000.01!!!`, done);
      });

      it('should match a 0', (done) => {
        expectCommandToMatch(`it's over 0!!!`, done);
      });

      it('should not match non-numbers', (done) => {
        expectCommandNotToMatch(`it's over john`, done);
      });
      
      it('should return a number, not a string', (done) => {
        expectCommandToMatchWith(
          `it's over 9,000.01!!!`,
          [ 9000.01 ],
          done
        );
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
        expectCommandToMatch('test 10/10/2016 test', done);
      });

      it('should match a date slot with a YYYY-MM-DD date', (done) => {
        expectCommandToMatch('test 2016-10-10 test', done);
      });

      it('should match a date slot with a MMM DD, YYYY date', (done) => {
        expectCommandToMatch('test Oct 10, 2016 test', done);
      });

      it('should match a date slot with a MMMM DD, YYYY date', (done) => {
        expectCommandToMatch('test October 10, 2016 test', done);
      });

      it('should match a date slot with "today"', (done) => {
        expectCommandToMatch('test today test', done);
      });

      it('should match a date slot with "tomorrow"', (done) => {
        expectCommandToMatch('test tomorrow test', done);
      });

      it('should match a date slot with "yesterday"', (done) => {
        expectCommandToMatch('test yesterday test', done);
      });

      it('should match a date slot with other strings', (done) => {
        expectCommandNotToMatch('test foobar test', done);
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
        expectCommandToMatch('test @test test', done);
      });

      it('should not match a bad name slot', (done) => {
        expectCommandNotToMatch('test test test', done);
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
        expectCommandToMatch('test #test test', done);
      });

      it('should match a name slot', (done) => {
        expectCommandToMatch('test @test test', done);
      });

      it('should not match a bad room slot', (done) => {
        expectCommandNotToMatch('test test test', done);
      });
    });
    
    describe('custom', () => {
      describe('duplicates', () => {
        it('should throw errors', (done) => {
          let error;
          
          nlc.addSlotType({
            type: 'STRING_TYPE',
            matcher: 'TEST'
          });
          
          // Duplicate the type (this should throw an error),
          try {
            nlc.addSlotType({
              type: 'STRING_TYPE',
              matcher: 'ANOTHER_TEST'
            });
          }
          catch (e) {
            // Save the error message.
            error = e;
          }
          
          // There should have been an error message.
          expect(error).to.exist;
          done();
        });
      });
      
      describe('strings', () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: 'STRING_TYPE',
            matcher: 'TEST'
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: 'CUSTOM_TEST',
            callback: matchCallback,
            slots: [
              {
                name: 'Custom',
                type: 'STRING_TYPE'
              }
            ],
            utterances: [
              'this is a {Custom}'
            ]
          });
        });
        
        it('should match a string slot', (done) => {
          expectCommandToMatch('this is a TEST', done);
        });
        
        it('should match a string slot with different case', (done) => {
          expectCommandToMatch('this is a test', done);
        });

        it('should not match a bad string slot', (done) => {
          expectCommandNotToMatch('this is a FAIL', done);
        });
      });
      
      describe('string arrays', () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: 'STRING_ARRAY_TYPE',
            matcher: [
              'this',
              'that'
            ]
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: 'CUSTOM_TEST',
            callback: matchCallback,
            slots: [
              {
                name: 'Custom',
                type: 'STRING_ARRAY_TYPE'
              }
            ],
            utterances: [
              'check {Custom} out'
            ]
          });
        });
        
        it('should match a string array slot', (done) => {
          expectCommandToMatch('check this out', done);
        });
        
        it('should match another string array', (done) => {
          expectCommandToMatch('check THAT out', done);
        });

        it('should not match a bad string slot', (done) => {
          expectCommandNotToMatch('check them out', done);
        });
      });
      
      describe('regular expressions', () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: 'PHONE_TYPE',
            matcher: /\d\d\d-\d\d\d-\d\d\d\d/
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: 'CUSTOM_TEST',
            callback: matchCallback,
            slots: [
              {
                name: 'Phone',
                type: 'PHONE_TYPE'
              }
            ],
            utterances: [
              'my phone number is {Phone}'
            ]
          });
        });
        
        it('should match when the slot matches the regexp', (done) => {
          expectCommandToMatch('my phone number is 555-555-5555', done);
        });

        it('should not match when the slot does not match the regexp', (done) => {
          expectCommandNotToMatch('my phone number is in your phone already', done);
        });
      });
      
      describe('functions', () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: 'SMALL_COUNT_TYPE',
            matcher: (slot) => {
              if (slot.length < 6) {
                return slot.length;
              }
            }
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: 'CUSTOM_TEST',
            callback: matchCallback,
            slots: [
              {
                name: 'Small',
                type: 'SMALL_COUNT_TYPE'
              }
            ],
            utterances: [
              `here's a small word: {Small}`
            ]
          });
        });
        
        it('should match when the slot matches the function', (done) => {
          expectCommandToMatch(`here's a small word: taco`, done);
        });

        it('should not match when the slot does not match the function', (done) => {
         expectCommandNotToMatch(`here's a small word: burrito`, done);
        });
        
        it('should get the return value of the function when matched', (done) => {
          expectCommandToMatchWith(`here's a small word: taco`, [4], done);
        });
      });
      
      describe('base matchers', () => {
        it('should not restrict slots without a base matcher', (done) => {
          // Add a type without a baseMatcher that looks for the word 'first'
          nlc.addSlotType({
            type: 'FIRST',
            matcher: 'first'
          });
          
          nlc.registerIntent({
            intent: 'COLLISION_TEST',
            callback: matchCallback,
            slots: [
              {
                name: 'First',
                type: 'FIRST'
              },
              {
                name: 'Second',
                type: 'STRING'
              }
            ],
            utterances: [
              '{First} {Second}'
            ]
          });
          
          // In this case, the FIRST slot got 'first followed by many more', which
          // didn't match.
          expectCommandNotToMatch('first followed by many more words', done);
        });
        
        it('should be able to restrict slot matches to a single word', (done) => {
          nlc.addSlotType({
            type: 'FIRST',
            matcher: 'first',
            baseMatcher: '\\w+'
          });
          
          nlc.registerIntent({
            intent: 'COLLISION_TEST',
            callback: matchCallback,
            slots: [
              {
                name: 'First',
                type: 'FIRST'
              },
              {
                name: 'Second',
                type: 'STRING'
              }
            ],
            utterances: [
              '{First} {Second}'
            ]
          });
          
          expectCommandToMatchWith(
            'first followed by many more words', 
            [ 'first', 'followed by many more words' ],
            done
          );
        });
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
        'test @name some more stuff test',
        ['@name', 'some more stuff'],
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

      expectCommandToMatch(`test ${BAD_DEFINITELY}`, done);
    });

    it('should be caught but not interfere with slots.', (done) => {
      const GOOD_DEFINITELY = 'definitely';
      const BAD_DEFINITELY = 'definately';

      nlc.registerIntent({
        intent: 'SPELLING_TEST',
        callback: matchCallback,
        slots: [
          {
            name: GOOD_DEFINITELY,
            type: 'STRING'
          }
        ],
        utterances: [
          `test {${GOOD_DEFINITELY}} ${GOOD_DEFINITELY}`
        ]
      });

      expectCommandToMatchWith(
        `test ${BAD_DEFINITELY} ${BAD_DEFINITELY}`,
        [BAD_DEFINITELY],
        done
      );
    });
    
  });

});
