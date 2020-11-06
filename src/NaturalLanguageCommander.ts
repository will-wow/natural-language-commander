import _ = require("lodash");

import {
  ISlotType,
  IIntent,
  ISlotFullfilment,
  IIntentFullfilment,
} from "./lib/nlcInterfaces";
import Matcher from "./lib/Matcher";
import { getRequired } from './lib/standardSlots';

/** Holds registered natural language commands. */
class NaturalLanguageCommander {
  /** List of registered slot types. */
  private slotTypes: { [name: string]: ISlotType };
  private intentNames: string[];
  private intents: IIntent[];
  private matchers: Matcher[];
  private notFoundCallback: () => void;

  /**
   * Sets up the nlc instance with the default stop types.
   */
  constructor() {
    this.slotTypes = {};
    this.intentNames = [];
    this.intents = [];
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

  public handleDialog(match: IIntentFullfilment, command: string): IIntentFullfilment {
    const intent = this.getIntent(match.intent);
    if (!intent || !match.required?.length) throw new Error(`NLC: unable to handle dialog ${match.intent}`);

    // save all intent slot utterances
    const dialogMatchers: Matcher[] = [];
    match.required!.forEach((slot) => {
      if(slot.dialog?.utterances) {
        slot.dialog.utterances.forEach((utterance) => {
          dialogMatchers.push(new Matcher(this.slotTypes, {
            intent: slot.name,
            slots: intent.slots,
            utterances: [],
          }, utterance.trim()));
        })
      }
    });

    // match against dialogs
    for (const matcher of dialogMatchers) {
      const orderedSlots: ISlotFullfilment[] = matcher.check(command);
      if (orderedSlots) {
        // merge previously filled slots and new ones using dict
        const slotMap = orderedSlots.reduce((acc, curr) => {acc[curr.name] = curr.value; return acc}, {});
        match.slots?.forEach((slot) => {
          if (!slotMap[slot.name]?.value && slot.value) slotMap[slot.name] = slot.value;
        });

        const slots = Object.keys(slotMap).map((name) => ({ name: name, value: slotMap[name]}));
        return {
          intent: match.intent,
          slots,
          required: getRequired(intent.slots, slots)
        }
      }
    }

    // If no dialog matched, 
    const otherIntent = this.handleCommand(command);
    if (otherIntent) return otherIntent;

    // if nothing matches, take the raw string as the next required slot
    const [{ name }, ...required] = match.required;

    return {
      ...match,
      slots: [...(intent.slots ?? []), { name,value: command }],
      required: required,
    }
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

  /** Handle a command normally. */
  public handleCommand(command: string): IIntentFullfilment | null {
    /** Flag if there was a match */
    let foundMatch: IIntentFullfilment | null = null;

    // Handle a normal command.
    _.forEach(this.matchers, (matcher: Matcher) => {
      /** The slots from the match or [], if the match was found. */
      const orderedSlots: ISlotFullfilment[] = matcher.check(command);

      // If orderedSlots is undefined, the match failed.
      if (orderedSlots) {
        foundMatch = {
          intent: matcher.intent.intent,
          slots: orderedSlots,
          // slots in intent that are required and not part of orderedSlots
          required: getRequired(matcher.intent.slots, orderedSlots)
        };

        // Flag that a match was found.
        // Exit early.
        if (!(/^{(\w+?)}$/.test(matcher.originalUtterance))) return false;
      }
    });

    // if the command is exactly the intent name
    if (!foundMatch) {
      _.forEach(this.intents, (intent) => {
        if (intent.intent === command) {
          foundMatch = {
            intent: intent.intent,
            slots: [],
            required: getRequired(intent.slots, []),
          }
          return false;
        }
      })
    }

    return foundMatch;
  }

  public getIntent(name: string): IIntent | null {
    return this.intents.find((intent) => intent.intent === name);
  }

  public getIntents() {
    return this.intents;
  }

  public getSlotTypes() {
    return this.slotTypes;
  }
}

export * from "./lib/nlcInterfaces";
export default NaturalLanguageCommander;
