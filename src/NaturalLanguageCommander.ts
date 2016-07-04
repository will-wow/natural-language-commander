import _ = require('lodash');

import Deferred from './lib/Deferred';
import * as standardSlots from './lib/standardSlots';
import {ISlotType, IIntent} from './lib/nlcInterfaces';
import Matcher from './lib/Matcher';

interface IDelay {
  (callback: () => void): number;
}

/** Holds registered natural language commands. */
class NaturalLanguageCommander {
  private slotTypes: { [name: string]: ISlotType } = {};
  private intents: IIntent[] = [];
  private matchers: Matcher[] = [];

  /**
   * Sets up the nlc instance with the default stop types.
   */
  constructor() {
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

    // Push in the utterance matchers.
    _.forEach(intent.utterances, (utterance: string): void => {
      this.matchers.push(new Matcher(this.slotTypes, intent, utterance));
    });
  };

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
   * @returns a promise resolved with the name of the matched intent, or rejected if no match.
   */
  public handleCommand(data: any, command: string): Promise<string>;
  public handleCommand(command: string): Promise<string>;
  public handleCommand(dataOrCommand: any, command?: string): Promise<string> {
    const deferred = new Deferred();

    // Handle overload.
    let data: any;
    if (command) {
      data = dataOrCommand;
    } else {
      command = dataOrCommand;
    }

    if (!_.isString(command)) {
      throw new Error(`NLC: ${command} must be a string!`);
    }

    // Clean up the input.
    command = this.cleanCommand(command);

    /** Flag if there was a match */
    let foundMatch: boolean = false;

    // Use setImmediate in node and FF, the slower setTimeout otherwise,
    // to delay the resolve so this is always async.
    const delay: IDelay = typeof setImmediate === 'function' ? setImmediate : setTimeout;

    delay(() => {
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
    });
    
    return deferred.promise;
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
    return _.includes(_.map(this.intents, 'intent'), intentName);
  }
}

// Use a standard npm export for post-transpile node compatibility.
export = NaturalLanguageCommander;
