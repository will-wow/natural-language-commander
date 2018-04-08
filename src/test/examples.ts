import _ = require("lodash");
import chai = require("chai");
import chaiSpies = require("chai-spies");

import NLC = require("../NaturalLanguageCommander");
import Deferred from "../lib/Deferred";
import TestUtils from "./TestUtils";

chai.use(chaiSpies);
const expect = chai.expect;

describe("README examples", () => {
  let nlc: NLC;
  let utils: TestUtils;
  function expectLog(message: string): void {
    expect(console.log).to.have.been.called.with(message);
  }

  beforeEach(() => {
    nlc = new NLC();
    utils = new TestUtils(nlc);

    chai.spy.on(console, "log");

    const favoriteColor = "blue";

    // Add a custom color slot type.
    nlc.addSlotType({
      type: "Color",
      matcher: ["red", "orange", "yellow", "green", "blue", "purple"],
      baseMatcher: "\\w+"
    });

    // Register an intent for guessing if the bot likes a color.
    nlc.registerIntent({
      intent: "FAVORITE_COLOR_GUESS",
      slots: [
        {
          name: "Color",
          type: "Color"
        }
      ],
      utterances: [
        "is your favorite color {Color}",
        "is {Color} the best color",
        "do you like {Color}",
        "do you love {Color}"
      ],
      callback: color => {
        if (color.toLowerCase() === favoriteColor) {
          console.log(`Correct! ${color} is my favorite color.`);
        } else {
          console.log(`Sorry, I don't really like ${color}.`);
        }
      }
    });

    // Register a question for asking the user their favorite color.
    nlc.registerQuestion({
      name: "USER_FAVORITE_COLOR",
      slotType: "Color",
      questionCallback: () => console.log(`What is your favorite color?`),
      successCallback: color => {
        if (color.toLowerCase() === favoriteColor) {
          console.log("Mine too!");
        } else {
          console.log(`meh.`);
        }
      },
      cancelCallback: () => console.log(`Fine don't tell me then.`),
      failCallback: () => console.log(`That's not even a color!`)
    });

    nlc.registerNotFound(() =>
      console.log(`Sorry I'm not sure what you mean.`)
    );
  });

  it("should run the full example", done => {
    nlc
      .handleCommand("is your favorite color Blue?")
      .then(() => expectLog("Correct! Blue is my favorite color."))

      .then(() => nlc.handleCommand("do you like blue"))
      .then(() => expectLog("Correct! blue is my favorite color."))

      .then(() => nlc.handleCommand("is red the best color?"))
      .then(() => expectLog(`Sorry, I don't really like red.`))

      .then(() => nlc.handleCommand("do you love Green"))
      .then(() => console.dir(console.log["__spy"]))
      .then(() => expectLog(`Sorry, I don't really like Green.`))

      .then(() => nlc.handleCommand("asdfasdf")) // No match
      .catch(() => expectLog(`Sorry I'm not sure what you mean.`))

      .then(() => nlc.handleCommand("do you think blue is pretty?")) // No match
      .catch(() => expectLog(`Sorry I'm not sure what you mean.`))

      .then(() => nlc.handleCommand("what is the meaning of life?")) // No match
      .catch(() => expectLog(`Sorry I'm not sure what you mean.`))

      .then(() => nlc.ask("USER_FAVORITE_COLOR"))
      .then(() => console.dir(console.log["__spy"]))
      .then(() => expectLog(`What is your favorite color?`))

      .then(() => nlc.handleCommand("blue"))
      .then(() => expectLog(`Mine too!`))

      .then(() => nlc.ask("USER_FAVORITE_COLOR"))
      .then(() => expectLog(`What is your favorite color?`))

      .then(() => nlc.handleCommand("tacos"))
      .catch(() => expectLog(`That's not even a color!`))

      .then(() => nlc.ask("USER_FAVORITE_COLOR"))
      .then(() => expectLog(`What is your favorite color?`))

      .then(() => nlc.handleCommand("nevermind"))
      .then(() => expectLog(`Fine don't tell me then.`))

      .then(() => nlc.ask("USER_FAVORITE_COLOR"))
      .then(() => expectLog("What is your favorite color?"))

      .then(() => nlc.handleCommand("do you like blue"))
      .then(() => expectLog("Correct! blue is my favorite color."))
      // Finally call done.
      .then(() => done());
  });
});
