/**
 * Standard slot types for the NaturalLanguageCommander
 * @module standardSlots
 */

import _ = require("lodash");
import moment = require("moment-timezone");

import { ISlotType, IIntentSlot, ISlotFullfilment } from "./nlcInterfaces";

// TODO: Make this configurable.
/** The timezone to use for relative dates. */
const TIMEZONE = "America/Los_Angeles";

const DATE_FORMATS = [
  "M/D/YYYY",
  "M-D-YYYY",
  "MMM D YYYY",
  "MMM D, YYYY",
  "MMMM D YYYY",
  "MMMM D, YYYY",
  "YYYY-M-D"
];

/** A string of any length. */
export const STRING: ISlotType = {
  type: "STRING",
  // Everything comes in as a string.
  matcher: _.identity
};

/** A string with only one word. */
export const WORD: ISlotType = {
  type: "WORD",
  matcher: _.identity,
  baseMatcher: "\\w+"
};

// Only tries to match a single run of numbers and valid formatters.
const numberBaseMatcher = "[\\d,]+(?:\\.[\\d,]+)?";

function numberMatcher(text: string): number {
  // Strip formatting commas.
  text = text.replace(/,/g, "");
  // Try to convert the string to a number.
  const maybeNumber: number = _.toNumber(text);

  // _.toNumber returns NaN if not a number.
  return isNaN(maybeNumber) ? undefined : maybeNumber;
}

/** A number */
export const NUMBER: ISlotType = {
  type: "NUMBER",
  matcher: numberMatcher,
  baseMatcher: numberBaseMatcher
};

/** A number in dollars. */
export const CURRENCY: ISlotType = {
  type: "CURRENCY",
  matcher: (text: string): number => {
    if (text[0] === "$") {
      text = text.slice(1);
    }

    return numberMatcher(text);
  },
  baseMatcher: "\\$?" + numberBaseMatcher
};

export const DATE: ISlotType = {
  type: "DATE",
  matcher: (dateString: string): moment.Moment => {
    /*
     * Realitive dates.
     */
    if (dateString === "today") {
      return moment()
        .tz(TIMEZONE)
        .startOf("day");
    }
    if (dateString === "tomorrow") {
      return moment()
        .tz(TIMEZONE)
        .startOf("day")
        .add(1, "day");
    }
    if (dateString === "yesterday") {
      return moment()
        .tz(TIMEZONE)
        .startOf("day")
        .subtract(1, "day");
    }

    /*
     * Specific dates.
     */
    // Try parsing the date with moment.
    const parsedDate: moment.Moment = moment(dateString, DATE_FORMATS, true);
    // Retun the date if it's valid.
    if (parsedDate.isValid()) {
      return parsedDate;
    }
  }
};

export const SLACK_NAME: ISlotType = {
  type: "SLACK_NAME",
  // Names start with @.
  matcher: /^@\w+/i,
  baseMatcher: "@\\w+"
};

export const SLACK_ROOM: ISlotType = {
  type: "SLACK_ROOM",
  // Rooms start with #, but names work too.
  matcher: /^[#@]\w+/i,
  baseMatcher: "[#@]\\w+"
};

export const getRequired = (intentSlots: IIntentSlot[], filled: ISlotFullfilment[]) => {
  return intentSlots?.filter(({ required, name }) => required && !filled.some((m) => !!m.value && (m.name === name))) || [];
}