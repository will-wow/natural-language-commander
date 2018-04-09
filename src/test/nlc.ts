import _ = require("lodash");
import chai = require("chai");
import chaiSpies = require("chai-spies");

import NLC = require("../NaturalLanguageCommander");
import Deferred from "../lib/Deferred";
import TestUtils from "./TestUtils";

chai.use(chaiSpies);
const expect = chai.expect;

describe("NLC", () => {
  let nlc: NLC;
  let utils: TestUtils;

  beforeEach(() => {
    nlc = new NLC();
    utils = new TestUtils(nlc);
  });

  describe("basic commands", () => {
    beforeEach(() => {
      // Register a simple intent.
      nlc.registerIntent({
        intent: "TEST",
        callback: utils.matchCallback,
        utterances: ["test"]
      });
    });

    it("should match a simple input", done => {
      utils.expectCommandToMatch("test", done);
    });

    it("should not match a simple bad input", done => {
      utils.expectCommandNotToMatch("tset", done);
    });

    it("should match after an utterance is added", done => {
      nlc.addUtterance("TEST", "tset");

      utils.expectCommandToMatch("tset", done);
    });
  });

  describe("deregistering", () => {
    describe("given some intents", () => {
      beforeEach(() => {
        nlc.registerIntent({
          intent: "REMOVE_ME",
          callback: utils.matchCallback,
          utterances: ["I shouldn't match"]
        });
        nlc.registerIntent({
          intent: "TEST",
          callback: utils.matchCallback,
          utterances: ["test"]
        });

        nlc.addUtterance("REMOVE_ME", "I also shouldn't match");
      });

      describe("deregisterIntent", () => {
        beforeEach(() => {
          nlc.deregisterIntent("REMOVE_ME");
        });
        it("won't match after a deregister", done => {
          utils.expectCommandNotToMatch("I shouldn't match", done);
        });

        it("won't match added utterances after a deregister", done => {
          utils.expectCommandNotToMatch("I also shouldn't match", done);
        });

        it("doesn't effect other intents", done => {
          utils.expectCommandToMatch("test", done);
        });
      });

      describe("removeUtterance", () => {
        beforeEach(() => {
          nlc.removeUtterance("REMOVE_ME", "I shouldn't match");
        });
        it("removes an utterance", done => {
          utils.expectCommandNotToMatch("I shouldn't match", done);
        });

        it("doesn't remove other utterances", done => {
          utils.expectCommandToMatch("I also shouldn't match", done);
        });
      });

      describe("removeSlotType", () => {
        beforeEach(() => {
          nlc.addSlotType({
            type: "STRING_TYPE",
            matcher: "TEST"
          });
        });

        describe("without any matching intents", () => {
          it("should work", () => {
            expect(() => {
              nlc.removeSlotType("STRING_TYPE");
            }).not.to.throw();
          });
        });

        describe("with a matching intent", () => {
          beforeEach(() => {
            nlc.registerIntent({
              intent: "STRING_TEST",
              callback: utils.matchCallback,
              slots: [
                {
                  name: "String",
                  type: "STRING_TYPE"
                }
              ],
              utterances: ["test {String} test"]
            });
          });

          it("should throw an error", () => {
            expect(() => {
              nlc.removeSlotType("STRING_TYPE");
            }).to.throw(
              "NLC: You can't remove the STRING_TYPE Slot Type while the STRING_TEST intent relies on it."
            );
          });
        });
      });
    });
  });

  describe("slot types", () => {
    describe("STRING", () => {
      beforeEach(() => {
        // Register an intent with a STRING.
        nlc.registerIntent({
          intent: "STRING_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "String",
              type: "STRING"
            }
          ],
          utterances: ["test {String} test"]
        });
      });

      it("should match a string slot", done => {
        utils.expectCommandToMatch("test this is a string test", done);
      });

      it("should not match a bad string slot", done => {
        utils.expectCommandNotToMatch("test test", done);
      });
    });

    describe("WORD", () => {
      beforeEach(() => {
        // Register an intent with a WORD.
        nlc.registerIntent({
          intent: "WORD_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "Word",
              type: "WORD"
            }
          ],
          utterances: ["test {Word} test"]
        });
      });

      it("should match a single word", done => {
        utils.expectCommandToMatch("test test test", done);
      });

      it("should not match multiple words", done => {
        utils.expectCommandNotToMatch("test too many test test", done);
      });
    });

    describe("NUMBER", () => {
      beforeEach(() => {
        // Register an intent with a NUMBER.
        nlc.registerIntent({
          intent: "NUMBER_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "Number",
              type: "NUMBER"
            }
          ],
          utterances: [`it's over {Number}!!!`]
        });
      });

      it("should match a number", done => {
        utils.expectCommandToMatch(`it's over 9000!!!`, done);
      });

      it("should match a number with commas", done => {
        utils.expectCommandToMatch(`it's over 9,000,000!!!`, done);
      });

      it("should match a number with decimals", done => {
        utils.expectCommandToMatch(`it's over 9,000.01!!!`, done);
      });

      it("should match a 0", done => {
        utils.expectCommandToMatch(`it's over 0!!!`, done);
      });

      it("should not match non-numbers", done => {
        utils.expectCommandNotToMatch(`it's over john`, done);
      });

      it("should match a number with too many decimals", done => {
        utils.expectCommandNotToMatch(`it's over 9,000.01.01!!!`, done);
      });

      it("should return a number, not a string", done => {
        utils.expectCommandToMatchWith(
          `it's over 9,000.01!!!`,
          [9000.01],
          done
        );
      });
    });

    describe("CURRENCY", () => {
      beforeEach(() => {
        // Register an intent with a CURRENCY.
        nlc.registerIntent({
          intent: "CURRENCY_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "Currency",
              type: "CURRENCY"
            }
          ],
          utterances: [`that'll be {Currency}`]
        });
      });

      it("should match a currency amount", done => {
        utils.expectCommandToMatch(`that'll be $1`, done);
      });

      it("should match a complicated currency amount", done => {
        utils.expectCommandToMatch(`that'll be $1,000,000.01`, done);
      });

      it("should match a number", done => {
        utils.expectCommandToMatch(`that'll be 1`, done);
      });
    });

    describe("DATE", () => {
      beforeEach(() => {
        // Register an intent with a DATE.
        nlc.registerIntent({
          intent: "DATE_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "Date",
              type: "DATE"
            }
          ],
          utterances: ["test {Date} test"]
        });
      });

      it("should match a date slot with a MM/DD/YYYY date", done => {
        utils.expectCommandToMatch("test 10/10/2016 test", done);
      });

      it("should match a date slot with a YYYY-MM-DD date", done => {
        utils.expectCommandToMatch("test 2016-10-10 test", done);
      });

      it("should match a date slot with a MMM DD, YYYY date", done => {
        utils.expectCommandToMatch("test Oct 10, 2016 test", done);
      });

      it("should match a date slot with a MMMM DD, YYYY date", done => {
        utils.expectCommandToMatch("test October 10, 2016 test", done);
      });

      it('should match a date slot with "today"', done => {
        utils.expectCommandToMatch("test today test", done);
      });

      it('should match a date slot with "tomorrow"', done => {
        utils.expectCommandToMatch("test tomorrow test", done);
      });

      it('should match a date slot with "yesterday"', done => {
        utils.expectCommandToMatch("test yesterday test", done);
      });

      it("should match a date slot with other strings", done => {
        utils.expectCommandNotToMatch("test foobar test", done);
      });
    });

    describe("SLACK_NAME", () => {
      beforeEach(() => {
        // Register an intent with a SLACK_NAME.
        nlc.registerIntent({
          intent: "SLACK_NAME_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "Name",
              type: "SLACK_NAME"
            }
          ],
          utterances: ["test {Name} test"]
        });
      });

      it("should match a name slot", done => {
        utils.expectCommandToMatch("test @test test", done);
      });

      it("should not match a bad name slot", done => {
        utils.expectCommandNotToMatch("test test test", done);
      });
    });

    describe("SLACK_ROOM", () => {
      beforeEach(() => {
        // Register an intent with a SLACK_ROOM.
        nlc.registerIntent({
          intent: "SLACK_ROOM_TEST",
          callback: utils.matchCallback,
          slots: [
            {
              name: "Room",
              type: "SLACK_ROOM"
            }
          ],
          utterances: ["test {Room} test"]
        });
      });

      it("should match a room slot", done => {
        utils.expectCommandToMatch("test #test test", done);
      });

      it("should match a name slot", done => {
        utils.expectCommandToMatch("test @test test", done);
      });

      it("should not match a bad room slot", done => {
        utils.expectCommandNotToMatch("test test test", done);
      });
    });

    describe("custom", () => {
      describe("duplicates", () => {
        beforeEach(() => {
          nlc.addSlotType({
            type: "STRING_TYPE",
            matcher: "TEST"
          });
        });

        it("should throw errors", () => {
          // Duplicate the type (this should throw an error),
          expect(() => {
            nlc.addSlotType({
              type: "STRING_TYPE",
              matcher: "ANOTHER_TEST"
            });
          }).to.throw();
        });

        it("should work if the slot type has been removed", () => {
          nlc.removeSlotType("STRING_TYPE");

          expect(() => {
            nlc.addSlotType({
              type: "STRING_TYPE",
              matcher: "ANOTHER_TEST"
            });
          }).not.to.throw();
        });
      });

      describe("strings", () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: "STRING_TYPE",
            matcher: "TEST"
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: "CUSTOM_TEST",
            callback: utils.matchCallback,
            slots: [
              {
                name: "Custom",
                type: "STRING_TYPE"
              }
            ],
            utterances: ["this is a {Custom}"]
          });
        });

        it("should match a string slot", done => {
          utils.expectCommandToMatch("this is a TEST", done);
        });

        it("should match a string slot with different case", done => {
          utils.expectCommandToMatch("this is a test", done);
        });

        it("should not match a bad string slot", done => {
          utils.expectCommandNotToMatch("this is a FAIL", done);
        });
      });

      describe("string arrays", () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: "STRING_ARRAY_TYPE",
            matcher: ["this", "that"]
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: "CUSTOM_TEST",
            callback: utils.matchCallback,
            slots: [
              {
                name: "Custom",
                type: "STRING_ARRAY_TYPE"
              }
            ],
            utterances: ["check {Custom} out"]
          });
        });

        it("should match a string array slot", done => {
          utils.expectCommandToMatch("check this out", done);
        });

        it("should match another string array", done => {
          utils.expectCommandToMatch("check THAT out", done);
        });

        it("should not match a bad string slot", done => {
          utils.expectCommandNotToMatch("check them out", done);
        });
      });

      describe("regular expressions", () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: "PHONE_TYPE",
            matcher: /\d\d\d-\d\d\d-\d\d\d\d/
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: "CUSTOM_TEST",
            callback: utils.matchCallback,
            slots: [
              {
                name: "Phone",
                type: "PHONE_TYPE"
              }
            ],
            utterances: ["my phone number is {Phone}"]
          });
        });

        it("should match when the slot matches the regexp", done => {
          utils.expectCommandToMatch("my phone number is 555-555-5555", done);
        });

        it("should not match when the slot does not match the regexp", done => {
          utils.expectCommandNotToMatch(
            "my phone number is in your phone already",
            done
          );
        });
      });

      describe("functions", () => {
        beforeEach(() => {
          // Add the custom slot type.
          nlc.addSlotType({
            type: "SMALL_COUNT_TYPE",
            matcher: slot => {
              if (slot.length < 6) {
                return slot.length;
              }
            }
          });

          // Register an intent with the custom slot type.
          nlc.registerIntent({
            intent: "CUSTOM_TEST",
            callback: utils.matchCallback,
            slots: [
              {
                name: "Small",
                type: "SMALL_COUNT_TYPE"
              }
            ],
            utterances: [`here's a small word: {Small}`]
          });
        });

        it("should match when the slot matches the function", done => {
          utils.expectCommandToMatch(`here's a small word: taco`, done);
        });

        it("should not match when the slot does not match the function", done => {
          utils.expectCommandNotToMatch(`here's a small word: burrito`, done);
        });

        it("should get the return value of the function when matched", done => {
          utils.expectCommandToMatchWith(
            `here's a small word: taco`,
            [4],
            done
          );
        });
      });

      describe("base matchers", () => {
        it("should not restrict slots without a base matcher", done => {
          // Add a type without a baseMatcher that looks for the word 'first'
          nlc.addSlotType({
            type: "FIRST",
            matcher: "first"
          });

          nlc.registerIntent({
            intent: "COLLISION_TEST",
            callback: utils.matchCallback,
            slots: [
              {
                name: "First",
                type: "FIRST"
              },
              {
                name: "Second",
                type: "STRING"
              }
            ],
            utterances: ["{First} {Second}"]
          });

          // In this case, the FIRST slot got 'first followed by many more', which
          // didn't match.
          utils.expectCommandNotToMatch(
            "first followed by many more words",
            done
          );
        });

        it("should be able to restrict slot matches to a single word", done => {
          nlc.addSlotType({
            type: "FIRST",
            matcher: "first",
            baseMatcher: "\\w+"
          });

          nlc.registerIntent({
            intent: "COLLISION_TEST",
            callback: utils.matchCallback,
            slots: [
              {
                name: "First",
                type: "FIRST"
              },
              {
                name: "Second",
                type: "STRING"
              }
            ],
            utterances: ["{First} {Second}"]
          });

          utils.expectCommandToMatchWith(
            "first followed by many more words",
            ["first", "followed by many more words"],
            done
          );
        });
      });
    });
  });

  describe("multiple slots", () => {
    it("should not collide when the first is a single word", done => {
      nlc.registerIntent({
        intent: "COLLISION_TEST",
        callback: utils.matchCallback,
        slots: [
          {
            name: "Name",
            type: "SLACK_NAME"
          },
          {
            name: "String",
            type: "STRING"
          }
        ],
        utterances: ["test {Name} {String} test"]
      });

      utils.expectCommandToMatchWith(
        "test @name some more stuff test",
        ["@name", "some more stuff"],
        done
      );
    });
  });

  describe("common mispellings", () => {
    it("should be caught", done => {
      const GOOD_DEFINITELY = "definitely";
      const BAD_DEFINITELY = "definately";

      nlc.registerIntent({
        intent: "SPELLING_TEST",
        callback: utils.matchCallback,
        utterances: [`test ${GOOD_DEFINITELY}`]
      });

      utils.expectCommandToMatch(`test ${BAD_DEFINITELY}`, done);
    });

    it("should be caught but not interfere with slots.", done => {
      const GOOD_DEFINITELY = "definitely";
      const BAD_DEFINITELY = "definately";

      nlc.registerIntent({
        intent: "SPELLING_TEST",
        callback: utils.matchCallback,
        slots: [
          {
            name: GOOD_DEFINITELY,
            type: "STRING"
          }
        ],
        utterances: [`test {${GOOD_DEFINITELY}} ${GOOD_DEFINITELY}`]
      });

      utils.expectCommandToMatchWith(
        `test ${BAD_DEFINITELY} ${BAD_DEFINITELY}`,
        [BAD_DEFINITELY],
        done
      );
    });
  });

  describe("questions", () => {
    let questionCallback;
    let successCallback;
    let cancelCallback;
    let failCallback;

    const USER_ID = "1";

    beforeEach(() => {
      questionCallback = chai.spy();
      successCallback = chai.spy();
      cancelCallback = chai.spy();
      failCallback = chai.spy();

      nlc.registerQuestion({
        questionCallback,
        successCallback,
        cancelCallback,
        failCallback,
        name: "QUESTION",
        slotType: "NUMBER"
      });
    });

    it("should resolve from ask when the question name exists", done => {
      nlc.ask("QUESTION").then((status: boolean) => {
        expect(status).to.be.true;
        done();
      });
    });

    it("should reject from ask when the question name does not exist", done => {
      nlc.ask("BAD").catch((status: boolean) => {
        expect(status).to.be.false;
        done();
      });
    });

    it("should reject from ask when the question name has been deregistered", done => {
      nlc.deregisterQuestion("QUESTION");

      nlc.ask("QUESTION").catch((status: boolean) => {
        expect(status).to.be.false;
        done();
      });
    });

    it("should call the questionCallback on ask", done => {
      nlc.ask("QUESTION").then(() => {
        expect(questionCallback).to.have.been.called();
        done();
      });
    });

    it("should not call the questionCallback on a bad ask", done => {
      nlc.ask("BAD").catch(() => {
        expect(questionCallback).not.to.have.been.called();
        done();
      });
    });

    it("should call the successCallback on a matching answer", done => {
      nlc.ask("QUESTION");

      nlc.handleCommand("10").then((questionName: string) => {
        expect(successCallback).to.have.been.called();
        done();
      });
    });

    it("should call the failCallback on a non-matching answer", done => {
      nlc.ask("QUESTION");

      nlc
        .handleCommand({
          command: "bad"
        })
        .catch((questionName: string) => {
          expect(failCallback).to.have.been.called();
          done();
        });
    });

    it("should call the cancelCallback on a cancel answer", done => {
      nlc.ask("QUESTION");

      nlc
        .handleCommand({
          command: "nevermind"
        })
        .then((questionName: string) => {
          expect(cancelCallback).to.have.been.called();
          done();
        });
    });

    it("should match other commands when the user is incorrect", done => {
      nlc.ask({
        userId: USER_ID,
        question: "QUESTION"
      });

      nlc.registerIntent({
        intent: "OTHER",
        utterances: ["10"],
        callback: utils.matchCallback
      });

      nlc
        .handleCommand({
          userId: "2",
          command: "10"
        })
        .then((intentName: string) => {
          expect(utils.matchCallback).to.have.been.called();
          expect(intentName).to.equal("OTHER");
          done();
        });
    });

    it("should match other commands when the user is not specified", done => {
      nlc.ask({
        userId: USER_ID,
        question: "QUESTION"
      });

      nlc.registerIntent({
        intent: "OTHER",
        utterances: ["10"],
        callback: utils.matchCallback
      });

      nlc.handleCommand("10").then((intentName: string) => {
        expect(utils.matchCallback).to.have.been.called();
        expect(intentName).to.equal("OTHER");
        done();
      });
    });

    it("should return the question name on successful answer matches", done => {
      nlc.ask("QUESTION");

      nlc
        .handleCommand({
          command: "10"
        })
        .then((questionName: string) => {
          expect(questionName).to.equal("QUESTION");
          done();
        });
    });

    it("should return the question name on unsuccessful answer matches", done => {
      nlc.ask("QUESTION");

      nlc
        .handleCommand({
          command: "bad"
        })
        .catch((questionName: string) => {
          expect(questionName).to.equal("QUESTION");
          done();
        });
    });

    it("should return the question name on cancelled answers", done => {
      nlc.ask("QUESTION");

      nlc
        .handleCommand({
          command: "nevermind"
        })
        .then((questionName: string) => {
          expect(questionName).to.equal("QUESTION");
          done();
        });
    });

    it("should pass along just the slot by default", done => {
      nlc.ask("QUESTION");

      nlc
        .handleCommand({
          command: "10"
        })
        .then((questionName: string) => {
          expect(successCallback).to.have.been.called.with(10);

          done();
        })
        .catch(done);
    });

    it("should pass along the user ID when specified", done => {
      nlc.ask({
        userId: USER_ID,
        question: "QUESTION"
      });

      nlc
        .handleCommand({
          userId: USER_ID,
          command: "10"
        })
        .then((questionName: string) => {
          expect(successCallback).to.have.been.called.with(USER_ID, 10);

          done();
        })
        .catch(done);
    });

    it("should pass along data when specified", done => {
      const data = { foo: "bar" };

      nlc.ask({
        userId: USER_ID,
        question: "QUESTION"
      });

      nlc
        .handleCommand({
          data,
          userId: "1",
          command: "10"
        })
        .then((questionName: string) => {
          expect(successCallback).to.have.been.called.with(data, 10);
          done();
        })
        .catch(done);
    });

    it("should allow for nested questions", done => {
      nlc.registerQuestion({
        name: "FIRST_QUESTION",
        slotType: "NUMBER",
        questionCallback: () => {},
        successCallback: () => nlc.ask("QUESTION"),
        cancelCallback: () => {},
        failCallback: () => {}
      });

      nlc
        .ask("FIRST_QUESTION")
        .then(() => nlc.handleCommand("1"))
        .then(() => {
          return new Promise(resolve => {
            setTimeout(resolve, 10);
          });
        })
        .then(() => nlc.handleCommand("2"))
        .then(() => {
          expect(successCallback).to.have.been.called();
          done();
        });
    });
  });

  describe("not found callback", () => {
    let notFoundCallback;

    beforeEach(() => {
      notFoundCallback = chai.spy();

      nlc.registerNotFound(notFoundCallback);
    });

    it("should get called when there is no match.", done => {
      nlc
        .handleCommand("bad")
        .catch(() => {
          expect(notFoundCallback).to.have.been.called();
        })
        .then(done);
    });
  });
});
