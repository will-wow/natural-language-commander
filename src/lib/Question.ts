import _ = require('lodash');

import NaturalLanguageCommander = require('../NaturalLanguageCommander');
import {IIntent, IQuestionIntent} from './nlcInterfaces';

/** Represents a registered question. */
class Question {
  private nlc: NaturalLanguageCommander;
  private JUST_THE_SLOT_UTTERANCE: string[] = [ '{Slot}' ];

  constructor(
    parentNlc: NaturalLanguageCommander,
    public intent: IQuestionIntent
  ) {
    // Set up a new NLC instance, with access to the parent slot types.
    this.nlc = parentNlc.clone();

    // Register the cancel intent first, so it matches first.
    if (this.intent.cancelCallback) {
      this.nlc.registerIntent(this.cancelIntent);
    }

    // Register an intent for the question.
    this.nlc.registerIntent(this.questionIntent);
  }

  public ask(userId: string, data: any) {
    this.intent.questionCallback(data || userId);
  }

  /**
   * Check an answer against the question matcher.
   */
  public answer(answer: string, userId: string, data: any) {
    return this.nlc.handleCommand({
      data: data || userId, 
      command: answer
    }).catch(() => {
      // Handle the failure.
      this.intent.failCallback(data);
      // Rethrow to pass the error along.
      throw new Error();
    });
  }

  /** A standard intent pulled from the question intent. */
  private get questionIntent(): IIntent {
    const utterances = this.intent.utterances || this.JUST_THE_SLOT_UTTERANCE;

    return {
      intent: this.intent.intent,
      slots: [
        {
          name: 'Slot',
          type: this.intent.slotType
        }
      ],
      utterances,
      callback: this.intent.successCallback
    };
  }

  /** An intent for cancelling the question. */
  private get cancelIntent(): IIntent {
    const utterances = this.intent.utterances || this.JUST_THE_SLOT_UTTERANCE;

    return {
      intent: 'CANCEL',
      slots: [
        {
          name: 'Slot',
          type: 'NEVERMIND'
        }
      ],
      utterances: this.JUST_THE_SLOT_UTTERANCE,
      callback: this.intent.cancelCallback
    };
  }
}

export default Question;