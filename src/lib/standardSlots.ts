/**
 * Standard slot types for the NaturalLanguageCommander
 * @module standardSlots
 */

import _ = require('lodash');
import moment = require('moment-timezone');

import {ISlotType} from './nlcInterfaces';

// TODO: Make this configurable.
/** The timezone to use for relative dates. */
const TIMEZONE = 'America/Los_Angeles';

const DATE_FORMATS = [
  'M/D/YYYY',
  'M-D-YYYY',
  'MMM D YYYY',
  'MMM D, YYYY',
  'MMMM D YYYY',
  'MMMM D, YYYY',
  'YYYY-M-D'
];

/** A string of any length. */
export const STRING: ISlotType = {
  type: 'STRING',
  // Everything comes in as a string.
  matcher: _.identity
};

/** A string with only one word. */
export const WORD: ISlotType = {
  type: 'WORD',
  matcher: _.identity,
  baseMatcher: '\\w+'
};

/** A number */
export const NUMBER: ISlotType = {
  type: 'NUMBER',
  matcher: (text: string): number => {
    // Strip formatting commas.
    text = text.replace(',', '');
    // Try to convert the string to a number.
    const maybeNumber: number = _.toNumber(text);

    // _.toNumber returns NaN if not a number.
    return isNaN(maybeNumber) ? undefined : maybeNumber;
  },
  // Only try to match a single run of numbers and valid formatters.
  baseMatcher: '[\d\.,]'
};

export const DATE: ISlotType = {
  type: 'DATE',
  matcher: (dateString: string): moment.Moment => {
    /*
     * Realitive dates.
     */
    if (dateString === 'today') {
      return moment().tz(TIMEZONE).startOf('day');
    } else if (dateString === 'tomorrow') {
      return moment().tz(TIMEZONE).startOf('day').add(1, 'day');
    } else if (dateString === 'yesterday') {
      return moment().tz(TIMEZONE).startOf('day').subtract(1, 'day');
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
  type: 'SLACK_NAME',
  // Names start with @.
  matcher: /^@\w+/i,
  baseMatcher: '@\\w+'
};

export const SLACK_ROOM: ISlotType = {
  type: 'SLACK_ROOM',
  // Rooms start with #, but names work too.
  matcher: /^[#@]\w+/i,
  baseMatcher: '[#@]\\w+'
};
