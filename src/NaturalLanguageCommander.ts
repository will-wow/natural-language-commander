import _ = require("lodash");

import Deferred from "./lib/Deferred";
import {
  ISlotType,
  IHandleCommandOptions,
  IAskOptions,
  IIntent,
  IQuestion,
  ISlotFullfilment,
  IIntentFullfilment,
} from "./lib/nlcInterfaces";
import Matcher from "./lib/Matcher";
import Question from "./lib/Question";
import { ANONYMOUS } from "./lib/constants";

interface IDelay {
  (callback: () => void): number;
}

// Use setImmediate in node and FF, or the slower setTimeout otherwise,
// to delay a resolve so it is always async.
const delay: IDelay =
  typeof setImmediate === "function" ? setImmediate : setTimeout;

/** Holds registered natural language commands. */
class NaturalLanguageCommander {
  /** List of registered slot types. */
  private slotTypes: { [name: string]: ISlotType };
  private intentNames: string[];
  private intents: IIntent[];
  private questions: { [name: string]: Question };
  private activeQuestions: { [userId: string]: Question };
  private matchers: Matcher[];
  private notFoundCallback: (data: any) => void;

  /**
   * Sets up the nlc instance with the default stop types.
   */
  constructor() {
    this.slotTypes = {};
    this.intentNames = [];
    this.intents = [];
    this.questions = {};
    this.activeQuestions = {};
    this.matchers = [];
    // Noop the notFoundCallback.
    this.notFoundCallback = () => {};

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
      slotType.matcher = _.map(matcher, (option: string): string =>
        option.toLowerCase()
      );
    }

    // Save the new type.
    this.slotTypes[slotType.type] = slotType;
  };

  /**
   * Remove a custom slot type by name. Throws an error if any existing intents
   * rely on the slot type.
   * @param slotTypeName
   */
  public removeSlotType = (slotTypeName: string): void => {
    const intentUsingSlotType = _.find(this.intents, intent => {
      const slotTypes = _.map(intent.slots || [], slot => slot.type);
      return _.includes(slotTypes, slotTypeName);
    });

    if (intentUsingSlotType) {
      throw new Error(
        `NLC: You can't remove the ${slotTypeName} Slot Type while the ${
          intentUsingSlotType.intent
        } intent relies on it.`
      );
    }

    delete this.slotTypes[slotTypeName];
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

    return true;
  };

  /**
   * De-register an intent. Bound to this.
   * @param intentName
   * @returns true if removed, false if the intent doesn't exist.
   */
  public deregisterIntent = (intentName: string): boolean => {
    if (!this.doesIntentExist(intentName)) {
      return false;
    }

    // Remove the name from the name list.
    this.intentNames = _.reject(this.intentNames, name => name === intentName);

    // Remove the intent.
    this.intents = _.reject(this.intents, { intent: intentName });

    // Remove matchers for the intent.
    this.matchers = _.reject(
      this.matchers,
      matcher => matcher.intent.intent === intentName
    );

    return true;
  };

  /**
   * Register a question. Bound to this.
   * @param intent
   * @returns true if added, false if the intent name already exists.
   */
  public registerQuestion = (questionData: IQuestion): boolean => {
    // Don't allow duplicate intents.
    if (this.doesIntentExist(questionData.name)) {
      return false;
    }

    // Record the question name for checking for duplicates.
    this.intentNames.push(questionData.name);

    // Set up the question.
    this.questions[questionData.name] = new Question(this, questionData);

    return true;
  };

  /**
   * De-register a question. Bound to this.
   * @param questionName
   * @returns true if removed, false if the question doesn't exist.
   */
  public deregisterQuestion = (questionName: string): boolean => {
    if (!this.doesIntentExist(questionName)) {
      return false;
    }

    // Remove from the namelist.
    this.intentNames = _.reject(
      this.intentNames,
      name => name === questionName
    );

    // Remove from the questions dictionary.
    delete this.questions[questionName];

    return true;
  };

  /**
   * Register a callback to be called when a command doesn't match.
   * Isn't called when an answer command doesn't match, since that is handled
   * elsewhere.
   * @param data - Arbitrary data to pass to the callback.
   * @param callback - Callback to run on failure. Optionally passed data from handleCommand.
   */
  public registerNotFound(callback: (data?: any) => void): void {
    this.notFoundCallback = callback;
  }

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
    const intent: IIntent = _.find(
      this.intents,
      (intent: IIntent): boolean => intent.intent === intentName
    );

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
   * Remove an utterance from an existing intent.
   * @param intentName - The name of the intent to add to.
   * @param utterance - The utterance string to add.
   * @returns False if the intent was not found or the utterance does not exist. Otherwise true.
   */
  public removeUtterance(intentName: string, utterance: string): boolean {
    // Get the intent by name.
    const intent: IIntent = _.find(
      this.intents,
      (intent: IIntent): boolean => intent.intent === intentName
    );

    // If not found, return.
    if (!intent) {
      return false;
    }

    // If the utterance does not exist, return false.
    if (!_.includes(intent.utterances, utterance)) {
      return false;
    }

    // Remove the utterance from the intent.
    intent.utterances = _.reject(
      intent.utterances,
      intentUtterance => intentUtterance === utterance
    );

    // Remove matchers for the intent.
    this.matchers = _.reject(
      this.matchers,
      matcher => matcher.originalUtterance === utterance
    );

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
  public handleCommand(
    dataOrCommandOrOptions: IHandleCommandOptions | string | any,
    command?: string
  ): Promise<string> {
    const deferred = new Deferred();

    // Handle overload.
    let data: any;
    let userId: string;
    if (_.isString(dataOrCommandOrOptions) && !command) {
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
      const commandResult: IIntentFullfilment = this.handleNormalCommand(data, command);

      // If the command was successful:
      if (commandResult) {
        // Resolve with the intent name, for logging.
        deferred.resolve(commandResult);
        return;
      }

      // If not successful, check if there's an active question for the user.
      if (this.getActiveQuestion(userId)) {
        // If there is one, answer it and handle the deferred in there.
        this.handleQuestionAnswer(deferred, data, command, userId);
      } else {
        // Otherwise call the not found handler, since there was no match.
        this.notFoundCallback(data);
        // Also reject the promise for logging.
        deferred.reject();
      }
    });

    return deferred.promise;
  }

  /**
   * Have NLC listen ask a question and listen for an answer for a given user.
   * Calling this while a question is active for the user replace the old question.
   * @param question - An intent name from a question intent.
   * @param options.data - arbitrary data to pass along.
   * @param options.userId - any unqiue identifier for a user.
   * @param options.question - An intent name from a question intent.
   * @returns false if questionName not found, true otherwise.
   */
  public ask(options: IAskOptions): Promise<boolean>;
  public ask(question: string): Promise<boolean>;
  public ask(optionsOrQuestion: IAskOptions | string): Promise<boolean> {
    const deferred = new Deferred();

    // Handle overload.
    let data: any;
    let userId: string;
    let questionName: string;

    if (_.isString(optionsOrQuestion)) {
      questionName = optionsOrQuestion;
    } else {
      userId = optionsOrQuestion.userId;
      data = optionsOrQuestion.data;
      questionName = optionsOrQuestion.question;
    }

    // Pull the question from the list of registered questions.
    const question: Question = this.questions[questionName];

    // If the question exists, make it active.
    if (question) {
      // Make the question active.
      this.setActiveQuestion(userId, question);
    }

    // Delay for async.
    delay(() => {
      if (question) {
        // Ask the question after a delay.
        question.ask(data || userId);
        // Resolve.
        deferred.resolve(true);
      } else {
        // Reject the promise if the question isn't set up.
        deferred.reject(false);
      }
    });

    return deferred.promise;
  }

  /**
   * Cleans up a command for processing.
   * @param command - the user's command.
   */
  private cleanCommand(command: string): string {
    return (
      command
        // Replace smart single quotes.
        .replace(/[\u2018\u2019]/g, "'")
        // Replace smart double quotes.
        .replace(/[\u201C\u201D]/g, '"')
        .trim()
    );
  }

  private doesIntentExist(intentName: string): boolean {
    return _.includes(this.intentNames, intentName);
  }

  /**
   * Look up the active question for a user (if any). If the userId is undefined,
   * check the anonymous user.
   */
  private getActiveQuestion(userId: string): Question {
    return this.activeQuestions[userId || ANONYMOUS];
  }

  /**
   * Set the active question for a user.
   */
  private setActiveQuestion(userId: string, question: Question): void {
    this.activeQuestions[userId || ANONYMOUS] = question;
  }

  /**
   * Deactive a question once the user has answered it.
   */
  private finishQuestion(userId: string): void {
    this.setActiveQuestion(userId, undefined);
  }

  /** Handle a command for an active question. */
  private handleQuestionAnswer(
    deferred: Deferred,
    data: any,
    command: string,
    userId: string
  ): void {
    // If this user has an active question, grab it.
    const question: Question = this.getActiveQuestion(userId);
    const questionName: string = question.name;

    // Finish the question before the answer is processed, in case the answer
    // kicks off another question.
    this.finishQuestion(userId);

    // Try to answer the question with the command.
    question
      .answer(command, data || userId)
      .then(() => {
        // If the answer matched, resolve with the question name.
        deferred.resolve(questionName);
      })
      .catch(() => {
        this.finishQuestion(userId);
        // If the answer failed, reject with the question name, so any
        // logger knows what question failed.
        deferred.reject(questionName);
      });
  }

  /** Handle a command normally. */
  private handleNormalCommand(data: any, command: string): IIntentFullfilment {
    /** Flag if there was a match */
    let foundMatch: IIntentFullfilment;

    // Handle a normal command.
    _.forEach(this.matchers, (matcher: Matcher) => {
      /** The slots from the match or [], if the match was found. */
      const orderedSlots: ISlotFullfilment[] = matcher.check(command);

      // If orderedSlots is undefined, the match failed.
      if (orderedSlots) {
        foundMatch = {
          intent: matcher.intent.intent,
          slots: orderedSlots,
        };
        
        const callSlots: any[] = orderedSlots.map(slot=>slot.value);

        if (data) {
          // Add the data as the first arg, if specified.
          callSlots.unshift(data);
        }

        // Call the callback with the slot values in order.
        matcher.intent.callback.apply(null, callSlots);
        // Flag that a match was found.
        
        // Exit early.
        if (!(/^{(\w+?)}$/.test(matcher.originalUtterance))) return false;
      }
    });

    return foundMatch;
  }
}

// Use a standard npm export for post-transpile node compatibility.
export = NaturalLanguageCommander;
