import _ = require('lodash');

import Deferred from './lib/Deferred';
import * as standardSlots from './lib/standardSlots';
import {ISlotType, IHandleCommandOptions, IIntent, IQuestionIntent} from './lib/nlcInterfaces';
import Matcher from './lib/Matcher';
import Question from './lib/Question';

interface IDelay {
  (callback: () => void): number;
}

// Use setImmediate in node and FF, or the slower setTimeout otherwise,
// to delay a resolve so it is always async.
const delay: IDelay = typeof setImmediate === 'function' ? setImmediate : setTimeout;

/** Holds registered natural language commands. */
class NaturalLanguageCommander {
  /** List of registered slot types. */
  private slotTypes: { [name: string]: ISlotType };
  private intentNames: string[];
  private intents: IIntent[];
  private questions: { [name: string]: Question };
  private activeQuestions: { [userId: string]: Question };
  private matchers: Matcher[];

  /**
   * Sets up the nlc instance with the default stop types.
   */
  constructor() {
    this.slotTypes = {};
    this.intentNames = [];
    this.intents = [];
    this.questions = {};
    this.matchers = [];

    // Add the standard slot types.
    _.forOwn(standardSlots, this.addSlotType);
  }

  /**
   * Add a custom slot type. Bound to this.
   * @param slotType
   */
  public addSlotType = (slotType: ISlotType): void => {
    // Don't allow users to overwrite slot types.
    if (this.slotTypes[slotType.type]) {
      throw new Error(`NLC: Slot Type ${slotType} already exists!`);
    }

    // Get the matcher, so the ts type guards work.
    const matcher = slotType.matcher;

    // Lowercase the slot type matcher.
    if (_.isString(matcher)) {
      slotType.matcher = matcher.toLowerCase();
    } else if (_.isArray(matcher)) {
      slotType.matcher = _.map(matcher, (option: string): string => option.toLowerCase());
    }

    // Save the new type.
    this.slotTypes[slotType.type] = slotType;
  };

  /**
   * Register an intent. Bound to this.
   * @param intent
   * @returns true if added, false if the intent name already exists.
   */
  public registerIntent = (intent: IIntent): boolean => {
    // Don't allow duplicate intents.
    if (this.doesIntentExist(intent.intent)) {
      return false;
    }

    // Push in the intent.
    this.intents.push(intent);
    // Record the intent name for checking for duplicates.
    this.intentNames.push(intent.intent);

    // Push in the utterance matchers.
    _.forEach(intent.utterances, (utterance: string): void => {
      this.matchers.push(new Matcher(this.slotTypes, intent, utterance));
    });
  };

  /**
   * Register a question intent. Bound to this.
   * @param intent
   * @returns true if added, false if the intent name already exists.
   */
  public registerQuestionIntent = (intent: IQuestionIntent): boolean => {
    // Don't allow duplicate intents.
    if (this.doesIntentExist(intent.intent)) {
      return false;
    }

    // Record the intent name for checking for duplicates.
    this.intentNames.push(intent.intent);

    // Set up the question.
    this.questions[intent.intent] = new Question(this, intent);
  };

  /**
   * Get a fresh copy of this instance of NLC, but with the same slotTypes
   * already registered.
   * @returns the fresh instance.
   */
  public clone(): NaturalLanguageCommander {
    const nlc = new NaturalLanguageCommander();

    nlc.slotTypes = this.slotTypes;

    return nlc;
  }

  /**
   * Add an utterance to an existing intent.
   * @param intentName - The name of the intent to add to.
   * @param utterance - The utterance string to add.
   * @returns False if the intent was not found or the utterance already exists. Otherwise true.
   */
  public addUtterance(intentName: string, utterance: string): boolean {
    // Get the intent by name.
    const intent: IIntent = _.find(this.intents, (intent: IIntent): boolean => intent.intent === intentName);

    // If not found, return.
    if (!intent) {
      return false;
    }

    // If the utterance already exists, return false.
    if (_.includes(intent.utterances, utterance)) {
      return false;
    }

    // Add the utterance to the intent.
    intent.utterances.push(utterance);
    // Add the utterance to the matchers list.
    this.matchers.push(new Matcher(this.slotTypes, intent, utterance));
    return true;
  }

  /**
   * Handle a user's command by checking for a matching intent, and calling that intent's callback.
   * @param data - Arbitrary data to pass to the callback.
   * @param command - The command to match against.
   * @param userId - any unqiue identifier for a user.
   * @returns a promise resolved with the name of the matched intent, or rejected if no match.
   * If the user had an active question, resolved or rejected with the name of the question intent.
   */
  public handleCommand(data: any, command: string): Promise<string>;
  public handleCommand(command: string): Promise<string>;
  public handleCommand(options: IHandleCommandOptions): Promise<string>;
  public handleCommand(dataOrCommandOrOptions: (IHandleCommandOptions | string | any), command?: string): Promise<string> {
    const deferred = new Deferred();

    // Handle overload.
    let data: any;
    let userId: string;
    if (_.isString(dataOrCommandOrOptions)) {
      // 2nd signature.
      command = dataOrCommandOrOptions;
    } else if (command) {
      // 1st signature.
      data = dataOrCommandOrOptions;
    } else {
      // 3rd signature.
      command = dataOrCommandOrOptions.command;
      data = dataOrCommandOrOptions.data;
      userId = dataOrCommandOrOptions.userId;
    }

    if (!_.isString(command)) {
      throw new Error(`NLC: ${command} must be a string!`);
    }

    // Clean up the input.
    command = this.cleanCommand(command);

    // Delay to ensure this is async.
    delay(() => {
      if (userId && this.activeQuestions[userId]) {
        this.handleQuestionAnswer(deferred, data, command, userId);
      } else {
        this.handleNormalCommand(deferred, data, command);
      }
    });

    return deferred.promise;
  }

  /**
   * Have NLC listen ask a question and listen for an answer for a given user.
   * Calling this while a question is active for the user replace the old question.
   * @param userId - any unqiue identifier for a user.
   * @param questionName - An intent name from a question intent.
   * @returns false if questionName not found, true otherwise. 
   */
  public ask(data: any, userId: string, questionName: string): boolean;
  public ask(userId: string, questionName: string): boolean;
  public ask(dataOrUserId: any | string, userIdOrQuestionName: string, questionName?: string): boolean {
    // Handle overload.
    let data: any;
    let userId: string;
    if (questionName) {
      data = dataOrUserId;
      userId = userIdOrQuestionName;
    } else {
      userId = dataOrUserId;
    }

    // Pull the question from the list of registered questions.
    const question: Question = this.questions[questionName];

    // Fail is the question wasn't set up.
    if (!question) {
      return false;
    }

    // Make the question active.
    this.activeQuestions[userId] = question;

    // Ask the question after a delay.
    delay(() => {
      question.ask(userId, data);
    });

    return true;
  }

  /**
   * Cleans up a command for processing.
   * @param command - the user's command.
   */
  private cleanCommand(command: string): string {
    return command
      // Replace smart single quotes.
      .replace(/[\u2018\u2019]/g, "'")
      // Replace smart double quotes.
      .replace(/[\u201C\u201D]/g, '"');
  }

  private doesIntentExist(intentName: string): boolean {
    return _.includes(this.intentNames, intentName);
  }

  /** Handle a command for an active question. */
  private handleQuestionAnswer(deferred: Deferred, data: any, command: string, userId: string): void {
    // If this user has an active question, grab it.
    const question: Question = this.activeQuestions[userId];
    const questionName: string = question.intent.intent;

    // Try to answer the question with the command.
    question.answer(command, userId, data)
      .then(() => {
        // If the answer matched, resolve with the question name.
        deferred.resolve(questionName);
      })
      .catch(() => {
        // If the answer failed, reject with the question name, so any
        // logger knows what question failed.
        deferred.reject(questionName);
      });
  }

  /** Handle a command normally. */
  private handleNormalCommand(deferred: Deferred, data: any, command: string): void {
    /** Flag if there was a match */
    let foundMatch: boolean = false;
    
    // Handle a normal command.
    _.forEach(this.matchers, (matcher: Matcher) => {
      /** The slots from the match or [], if the match was found. */
      const orderedSlots: any[] = matcher.check(command);

      // If orderedSlots is undefined, the match failed.
      if (orderedSlots) {
        if (data) {
          // Add the data as the first arg, if specified.
          orderedSlots.unshift(data);
        }

        // Call the callback with the slot values in order.
        matcher.intent.callback.apply(null, orderedSlots);
        // Resolve with the intent name, for reference.
        deferred.resolve(matcher.intent.intent);
        // Flag that a match was found.
        foundMatch = true;
        // Exit early.
        return false;
      }
    });

    // Reject if no matches.
    if (!foundMatch) {
      deferred.reject();
    }
  }
}

// Use a standard npm export for post-transpile node compatibility.
export = NaturalLanguageCommander;
