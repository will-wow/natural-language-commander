import _ = require('lodash');

import NaturalLanguageCommander = require('../NaturalLanguageCommander');
import {IIntent, IQuestion} from './nlcInterfaces';

/** Represents a registered question. */
class Question {
  public name: string;
  private nlc: NaturalLanguageCommander;
  private JUST_THE_SLOT_UTTERANCE: string[] = [ '{Slot}' ];

  constructor(
    parentNlc: NaturalLanguageCommander,
    private questionData: IQuestion
  ) {
    // Set up a new NLC instance, with access to the parent slot types.
    this.nlc = parentNlc.clone();

    this.name = this.questionData.name;

    // Register the cancel intent first, so it matches first.
    if (this.questionData.cancelCallback) {
      this.nlc.registerIntent(this.cancelIntent);
    }

    // Register an intent for the question.
    this.nlc.registerIntent(this.questionIntent);
  }

  public ask(data: any) {
    this.questionData.questionCallback(data);
  }

  /**
   * Check an answer against the question matcher.
   */
  public answer(answer: string, data: any) {
    let commandPromise;

    // Handle the command, passing along data only if specified.
    if (data === undefined) {
      commandPromise = this.nlc.handleCommand(answer);
    } else {
      commandPromise = this.nlc.handleCommand(data, answer);
    }

    return commandPromise.catch(() => {
      // Handle the failure.
      this.questionData.failCallback(data);
      // Rethrow to pass the error along.
      throw new Error();
    });
  }

  /** A standard intent pulled from the question intent. */
  private get questionIntent(): IIntent {
    const utterances = this.questionData.utterances || this.JUST_THE_SLOT_UTTERANCE;

    return {
      intent: this.name,
      slots: [
        {
          name: 'Slot',
          type: this.questionData.slotType
        }
      ],
      utterances,
      callback: this.questionData.successCallback
    };
  }

  /** An intent for cancelling the question. */
  private get cancelIntent(): IIntent {
    const utterances = this.questionData.utterances || this.JUST_THE_SLOT_UTTERANCE;

    return {
      intent: 'CANCEL',
      slots: [
        {
          name: 'Slot',
          type: 'NEVERMIND'
        }
      ],
      utterances: this.JUST_THE_SLOT_UTTERANCE,
      callback: this.questionData.cancelCallback
    };
  }
}

export default Question;