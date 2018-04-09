import _ = require("lodash");
import chai = require("chai");
import chaiSpies = require("chai-spies");

import NLC = require("../NaturalLanguageCommander");
import Deferred from "../lib/Deferred";

chai.use(chaiSpies);
const expect = chai.expect;

/** Holds utils for testing NLC. */
class TestUtils {
  public matchCallback;
  public noMatchCallback;

  /** Set up the matcher callbacks. Should be called in a beforeEach. */
  constructor(private nlc: NLC) {
    // Set up the matcher callbacks.
    this.matchCallback = chai.spy();
    this.noMatchCallback = chai.spy();
  }

  /** Expect a command to get a match. */
  public expectCommandToMatch(command: string, done) {
    this.nlc
      .handleCommand(command)
      .catch(this.noMatchCallback)
      .then(() => {
        expect(this.matchCallback).to.have.been.called();
        expect(this.noMatchCallback).not.to.have.been.called();
        done();
      })
      .catch(error => done(error));
  }

  /** Expect a command to get a match with paramaters. */
  public expectCommandToMatchWith(command: string, args: any[], done) {
    this.nlc
      .handleCommand(command)
      .catch(this.noMatchCallback)
      .then(() => {
        // Get the context for the with() call, so appy doesn't break the this binding.
        // Cast as any, because Chai.Assertion implements a length function, which
        // is confusing the compiler I think.
        const expectCalledWith: any = expect(this.matchCallback).to.have.been
          .called.with;

        expectCalledWith.apply(expectCalledWith, args);
        expect(this.noMatchCallback).not.to.have.been.called();
        done();
      })
      .catch(error => done(error));
  }

  /** Expect a command not to get a match. */
  public expectCommandNotToMatch(command: string, done) {
    this.nlc
      .handleCommand(command)
      .catch(this.noMatchCallback)
      .then(() => {
        expect(this.matchCallback).not.to.have.been.called();
        expect(this.noMatchCallback).to.have.been.called();
        done();
      })
      .catch(error => done(error));
  }
}

export default TestUtils;
