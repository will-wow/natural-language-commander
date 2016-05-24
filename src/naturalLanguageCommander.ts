/**
 * A singelton that holds all registered natural language commands for the bot.
 * @module naturalLanguageCommander
 */

import _ = require('lodash');

import promise = require('es6-promise');
import Deferred from './lib/Deferred';
import * as utils from './nlcUtils';
import * as standardSlots from './standardSlots';

const Promise = promise.Promise;

type SlotTypeFunction = (message: string) => any;
type SlotTypeItem = string | string[] | RegExp | SlotTypeFunction;

/** A slot type to be used in intents.. */
export type ISlotType = {
  /** The slot type name. */
  type: string;
  /** The associated options */
  options: SlotTypeItem;
}

/** A slot to associate with an intent. */
export type IIntentSlot = {
  /** The name used in the associated utterances. */
  name: string;
  /** The slot type. */
  type: string;
}

export type IIntent = {
  /** The intent name. */
  intent: string;
  /** The callback to run when the intent matches. */
  callback: ((...slots: (string | any)[]) => void) | ((data: any, ...slots: string[]) => void);
  /**
   * The slots used in the utterances. Matched text will be returned as arguments
   * to the intent callback, in order.
   */
  slots?: IIntentSlot[];
  /**
   * Array of utterances to match, including slots like {SlotName}
   */
  utterances: string[] | string[][];
}

/** Internal utterance matcher. */
interface IUtteranceMatcher {
  intent: IIntent;
  matcher: RegExp;
  mapping: IIntentSlot[];
}

type SlotMapping = {
  [slotName: string]: any;
}

class NaturalLanguageCommander {
  private slotTypes: { [name: string]: SlotTypeItem } = {};
  private intents: IIntent[] = [];
  private matchers: IUtteranceMatcher[] = [];

  /** Holds registered natural language commands. */
  constructor () {
    // Add the standard slot types.
    _.forOwn(standardSlots, this.addSlotType);
  }

  /**
   * Add a custom slot type. Bound to this.
   * @param slotType
   */
  public addSlotType = (slotType: ISlotType): void => {
    this.slotTypes[slotType.type] = slotType.options;
  };

  /**
   * Register an intent. Bound to this.
   * @param intent
   */
  public registerIntent = (intent: IIntent): boolean => {
    if (_.includes(_.map(this.intents, 'name'), intent.intent)) {
      return false;
    }

    // Push in the intent.
    this.intents.push(intent);

    // Push in the utterance matchers.
    _.forEach(intent.utterances, (utterance: string): void => {
      this.matchers.push(this.getUtteranceMatcher(utterance, intent));
    });
  };

  public handleCommand(data: any, command: string): promise.Promise<string>;
  public handleCommand(command: string): promise.Promise<string>;
  public handleCommand(dataOrCommand: any, command?: string): promise.Promise<string> {
    const deferred = new Deferred();

    // Handle overload.
    let data: any;
    if (command) {
      data = dataOrCommand;
    } else {
      command = dataOrCommand;
    }

    // Clean up the input.
    command = this.cleanCommand(command);

    /** Flag if there was a match */
    let foundMatch: boolean = false;

    // TODO: Use nextTick here.
    _.forEach(this.matchers, (matcher: IUtteranceMatcher) => {
      const slotValues: SlotMapping = this.checkCommandForMatch(command, matcher);

      if (slotValues) {
        const orderedSlots: any[] = this.getOrderedSlots(matcher.intent, slotValues);

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

    return deferred.promise;
  }

  /**
   * Get the slot values in the order specified by an intent.
   * @param intent - The user's intent.
   * @param slotMapping - The slot values mapped to their names.
   * @returns The ordered array of slot values.
   */
  private getOrderedSlots(intent: IIntent, slotMapping: SlotMapping): any[] {
    // Loop through the intent's slot ordering.
    return _.map(intent.slots, (slot: IIntentSlot): any => {
      // Add the slot values in order.
      return slotMapping[slot.name];
    });
  }

  /**
   * Check a command against an utterance matcher.
   * @param command - The command text.
   * @param matcher - An utternace matcher
   * @returns undefined if no match, an object of slotNames to the matched data otherwise.
   */
  private checkCommandForMatch(command: string, matcher: IUtteranceMatcher): SlotMapping {
    const matches = command.match(matcher.matcher);

    // If the command didn't match, failure.
    if (!matches) {
      return;
    }

    // If it matched, and there are no slots, success!
    // Return an empty array of slots, so the function return truthy.
    if (matcher.mapping.length === 0) {
      return [];
    }

    // Remove the global match, we don't need it.
    matches.shift();

    // Flag if there was a bad match.
    let badMatch: boolean = false;
    /** Map the slotNames to the matched data. */
    let matchedSlots: SlotMapping = {};

    // Check each slot to see if it matches.
    _.forEach(matcher.mapping, (slot: IIntentSlot, i: number) => {
      const slotText = matches[i];
      const slotData: any = this.checkSlotMatch(slotText, slot.type);

      // If the slot didn't match, note the bad match, and exit early.
      if (!slotData) {
        badMatch = true;
        return false;
      }

      // Associate the slot data with the name.
      matchedSlots[slot.name] = slotData;
    });

    // If there were no bad maches, return the slots. Otherwise return nothing.
    if (!badMatch) {
      return matchedSlots;
    }
  }

  /**
   * Check text for a slotType match.
   * @param slotType - The slotType name
   * @param text - The text to match against.
   * @returns undefined if no match, otherwise the return value of the slot type.
   */
  private checkSlotMatch(slotText: string, slotTypeName: string): any {
    // Handle unknown slot types.
    if (!this.slotTypes[slotTypeName]) {
      throw new Error(`Slot Type ${slotTypeName} not found!`);
    }

    const slotType: SlotTypeItem = this.slotTypes[slotTypeName];

    // Match the slot based on the type.
    if (_.isRegExp(slotType)) {
      return this.getRegexpSlot(slotText, slotType);
    } else if (_.isString(slotType)) {
      return this.getStringSlot(slotText, slotType);
    } else if (_.isArray(slotType)) {
      return this.getListSlotType(slotText, slotType);
    } else {
      return this.getFunctionSlotType(slotText, slotType);
    }
  }

  /**
   * Check the slot text against the slot regular expression, and return the text if it matches.
   */
  private getRegexpSlot(slotText: string, slotType: RegExp): string {
    if (slotType.test(slotText)) {
      return slotText;
    }
  }

  /**
   * Check if the string matches the slotType, and return the type's string if it does.
   */
  private getStringSlot(slotText: string, slotType: string): string {
    if (slotText === slotType) {
      // Return the actual slotText if it matches directly.
      return slotText;
    } else if (slotText.toLowerCase() === slotType) {
      // If the lowercase matches, return the set type's capitaliztion.
      return slotType;
    }
  }

  /**
   * Check if the string matches the slotType function, and return the function's return value if it does.
   */
  private getFunctionSlotType(slotText: string, slotType: SlotTypeFunction): string {
    return slotType(slotText);
  }

  /**
   * Check if the string is contained in the string array, and return it if it does.
   */
  private getListSlotType(slotText: string, slotType: string[]): string {
    if (_.includes(slotType, slotText)) {
      // Return the actual slotText if it matches directly.
      return slotText;
    } else if (_.includes(slotType, slotText.toLowerCase())) {
      // If the lowercase matches, return the text's lowercase capitaliztion.
      return slotText.toLowerCase();
    }
  }

  private getUtteranceMatcher(utterance: string, intent: IIntent): IUtteranceMatcher {
    const slots: IIntentSlot[] = intent.slots;
    const slotMapping: IIntentSlot[] = [];

    // Handle slot replacement.
    if (slots && slots.length) {
      // A lazy regexp that looks for words in curly braces.
      // Don't use global, so it checks the new utterance fresh every time.
      const slotRegexp: RegExp = /{(\w+?)}/;
      const names: string[] = _.map<IIntentSlot, string>(slots, 'name');
      let matchIndex: number;

      // Loop while there are still slots left.
      while ((matchIndex = utterance.search(slotRegexp)) !== -1) {
        /** The name of the slot, not including the braces. */
        const slotName: string = utterance.match(slotRegexp)[1];
        /** The length of the whole slot match. */
        const matchLength: number = utterance.match(slotRegexp)[0].length;

        // Check if the slot name matches the intent's slot names.
        if (_.includes(names, slotName)) {
          // Find where in the slot names array this slot is.
          const slotIndex: number = names.indexOf(slotName);
          // Find the matching slot type.
          const slot: IIntentSlot = slots[slotIndex];

          // Update the utterance.
          utterance = this.repaceSlotWithCaptureGroup(
            utterance,
            matchIndex,
            matchLength
          );
          // Record the match ordering for this slot in the utterance.
          slotMapping.push(slot);
        } else {
          // Throw an error so the user knows they used a bad slot.
          // TODO: Handle intentional slot-looking charater runs with escaping or something?
          throw new Error(`NLC: slot "${slotName}" not included in slots ${JSON.stringify(names)} for ${intent.intent}!`);
        }
      }
    }

    utterance = this.replaceSpacesForRegexp(utterance);
    utterance = this.replaceBracesForRegexp(utterance);
    // Add the start carat, so this only matches the start of commands,
    // which helps with collisions.
    utterance = '^\\s*' + utterance;

    return {
      intent,
      // Compile the regular expression, ignore case.
      matcher: new RegExp(utterance, 'i'),
      // Store the mapping for later retrieval.
      mapping: slotMapping
    };
  }

  /** Replace runs of spaces with the space character, for better matching. */
  private replaceSpacesForRegexp(utterance: string): string {
    return _.replace(utterance, /\s+/g, '\\s+');
  }

  /** Escape braces that would cause a problem with regular expressions. */
  private replaceBracesForRegexp(utterance: string): string {
    utterance
    .replace('[', '\\[')
    .replace(']', '\\]')
    .replace('(', '\\(')
    .replace(')', '\\)');

    return utterance;
  }

  /**
   * Replace a solt with a regex capture group.
   */
  private repaceSlotWithCaptureGroup(utterance: string, matchIndex: number, matchLength: number): string {
    // Find the end of the slot name (accounting for braces).
    const lastIndex: number = matchIndex + matchLength;

    // Replace the slot with a generic capture group.
    return utterance.slice(0, matchIndex) + '(.+)' + utterance.slice(lastIndex);
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
}

export default new NaturalLanguageCommander();
