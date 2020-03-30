import _ = require("lodash");

import commonMistakes from "./commonMistakes";
import {
  SlotTypeFunction,
  SlotTypeItem,
  ISlotType,
  IIntentSlot,
  IIntent,
  ISlotFullfilment,
} from "./nlcInterfaces";

/**
 * A mapping of local slot names to slot values.
 */
type ISlotMapping = {
  [slotName: string]: any;
};

/**
 * Matches a utterance and slots against a command.
 */
class Matcher {
  /** The utterance used to set up the Matcher, for finding to remove. */
  public originalUtterance: string;
  /** The regexp used to match against a command. */
  private regExp: RegExp;
  /** Map of the intent's slot names to slot types. */
  private slotMapping: IIntentSlot[];

  /**
   * Set up a new matcher for an intent's utterance.
   * @param slotTypes - a reference to the set up slotTypes for the NLC instance.
   * @param intent - The intent this matcher is for.
   * @param utterance - The utterance this matcher is for.
   */
  constructor(
    private slotTypes: { [name: string]: ISlotType },
    public intent: IIntent,
    utterance: string
  ) {
    this.originalUtterance = utterance;

    const slots: IIntentSlot[] = this.intent.slots;
    const slotMapping: IIntentSlot[] = [];

    // Handle slot replacement.
    if (slots && slots.length) {
      // A lazy regexp that looks for words in curly braces.
      // Don't use global, so it checks the new utterance fresh every time.
      const slotRegexp: RegExp = /{(\w+?)}/;
      const names: string[] = _.map(slots, "name");
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
          // Find the matching intent slot.
          const slot: IIntentSlot = slots[slotIndex];
          // Find the matching slot type.
          const slotType: ISlotType = this.slotTypes[slot.type];

          // Handle bad slot type.
          if (!slotType) {
            throw new Error(`NLC: slot type ${slot.type} does not exist!`);
          }

          // Update the utterance.
          utterance = this.repaceSlotWithCaptureGroup(
            utterance,
            slotType,
            matchIndex,
            matchLength
          );
          // Record the match ordering for this slot in the utterance.
          slotMapping.push(slot);
        } else {
          // Throw an error so the user knows they used a bad slot.
          // TODO: Handle intentional slot-looking charater runs with escaping or something?
          throw new Error(
            `NLC: slot "${slotName}" not included in slots ${JSON.stringify(
              names
            )} for ${intent.intent}!`
          );
        }
      }
    }

    // Do some regex-readying on the utterance.
    utterance = this.replaceCommonMispellings(utterance);
    utterance = this.replaceSpacesForRegexp(utterance);
    utterance = this.replaceBracesForRegexp(utterance);

    utterance = "^\\s*" + utterance + "\\s*$";

    // Compile the regular expression, ignore case.
    this.regExp = new RegExp(utterance, "i");
    // Store the mapping for later retrieval.
    this.slotMapping = slotMapping;
  }

  /**
   * Check if the matcher matches a command.
   * @param command - the command to match against.
   * @returns An ordered array of slot matches. Undefined if no match.
   */
  public check(command: string): any[] {
    /** The matches for the slots. */
    const matches = command.match(this.regExp);

    // If the command didn't match, failure.
    if (!matches) {
      return;
    }

    // If it matched, and there are no slots, success!
    // Return an empty slotMapping, so the function returns truthy.
    if (this.slotMapping.length === 0) {
      return [];
    }

    // Remove the first, global match, we don't need it.
    matches.shift();

    // Flag if there was a bad match.
    let badMatch: boolean = false;
    /** Map the slotNames to the matched data. */
    const matchedSlots: ISlotMapping = {};

    // Check each slot to see if it matches.
    _.forEach(this.slotMapping, (slot: IIntentSlot, i: number) => {
      const slotText = matches[i];
      const slotData: any = this.checkSlotMatch(slotText, slot.type);

      // If the slot didn't match, note the bad match, and exit early.
      // Allow the value 0 to match.
      if (slotData === undefined || slotData === "") {
        badMatch = true;
        return false;
      }

      // Associate the slot data with the name.
      matchedSlots[slot.name] = slotData;
    });

    // If there were no bad maches, return the slots. Otherwise return nothing.
    if (!badMatch) {
      return this.getOrderedSlots(matchedSlots);
    }
  }

  // ==============================
  // Constructor methods
  // ==============================
  /**
   * For any word in the utterance that has common misspellings, replace it with
   * a group that catches them.
   * @param utterance - The utterance.
   * @returns the utterance with replacements.
   */
  private replaceCommonMispellings(utterance: string): string {
    // Split utterance into words, removing duplicates.
    const words = _.chain(utterance)
      .words()
      .uniq()
      .value();

    _.forEach(words, word => {
      // Get the mistake checker, if there is one.
      const mistakeReplacement = commonMistakes(word);

      if (mistakeReplacement) {
        // Replace all instances of the word with the replacement, if there is one.
        utterance = utterance.replace(
          new RegExp(word, "ig"),
          mistakeReplacement
        );
      }
    });

    return utterance;
  }

  /** Replace runs of spaces with the space character, for better matching. */
  private replaceSpacesForRegexp(utterance: string): string {
    return _.replace(utterance, /\s+/g, "\\s+");
  }

  /** Escape braces that would cause a problem with regular expressions. */
  private replaceBracesForRegexp(utterance: string): string {
    utterance
      .replace("[", "\\[")
      .replace("]", "\\]")
      .replace("(", "\\(")
      .replace(")", "\\)");

    return utterance;
  }

  /**
   * Replace a solt with a regex capture group.
   */
  private repaceSlotWithCaptureGroup(
    utterance: string,
    slotType: ISlotType,
    matchIndex: number,
    matchLength: number
  ): string {
    // Find the end of the slot name (accounting for braces).
    const lastIndex: number = matchIndex + matchLength;
    const matcher = slotType.baseMatcher || ".+";

    // Replace the slot with a generic capture group.
    return `${utterance.slice(0, matchIndex)}(${matcher})${utterance.slice(
      lastIndex
    )}`;
  }

  // ==============================
  // Check methods
  // ==============================
  /**
   * Check text for a slotType match.
   * @param slotText - The text to match against.
   * @param slotType - The slotType name
   * @returns undefined if no match, otherwise the return value of the slot type transform.
   */
  private checkSlotMatch(slotText: string, slotTypeName: string): any {
    // Handle unknown slot types.
    if (!this.slotTypes[slotTypeName]) {
      throw new Error(`NLC: Slot Type ${slotTypeName} not found!`);
    }

    const slotType: ISlotType = this.slotTypes[slotTypeName];
    const slotOptions: SlotTypeItem = slotType.matcher;
    
    // Match the slot based on the type.
    if (_.isRegExp(slotOptions)) {
      return this.getRegexpSlot(slotText, slotOptions);
    }
    if (_.isString(slotOptions)) {
      return this.getStringSlot(slotText, slotOptions);
    }
    if (_.isArray(slotOptions)) {
      return this.getListSlotType(slotText, slotOptions);
    }
    return this.getFunctionSlotType(slotText, slotOptions);
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
    if (slotText.toLowerCase() === slotType) {
      return slotText;
    }
  }

  /**
   * Check if the string matches the slotType function, and return the function's return value if it does.
   */
  private getFunctionSlotType(
    slotText: string,
    slotType: SlotTypeFunction
  ): string {
    return slotType(slotText);
  }

  /**
   * Check if the string is contained in the string array, and return it if it does.
   */
  private getListSlotType(slotText: string, slotType: string[]): string {
    if (_.includes(slotType, slotText.toLowerCase())) {
      return slotText;
    }
  }

  /**
   * Get the slot values in the order specified by an intent.
   * @param slotMapping - The slot values mapped to their names.
   * @returns The ordered array of slot values.
   */
  private getOrderedSlots(slotMapping: ISlotMapping): ISlotFullfilment[] {
    // Loop through the intent's slot ordering.
    return _.map(this.intent.slots, (slot: IIntentSlot): ISlotFullfilment => {
      // Add the slot values in order.
      return {
        name: slot.name,
        value: slotMapping[slot.name],
      };
    });
  }
}

export default Matcher;
