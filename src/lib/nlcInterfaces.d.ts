export type SlotTypeFunction = (message: string) => any;
export type SlotTypeItem = string | string[] | RegExp | SlotTypeFunction;

/** A slot type to be used in intents. */
export type ISlotType = {
  /** The slot type name. */
  type: string;
  /** The associated options */
  matcher: SlotTypeItem;
  /** The first-round matcher for the regex. */
  baseMatcher?: string;
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
  /**
   * The slots used in the utterances. Matched text will be returned as arguments
   * to the intent callback, in order.
   */
  slots?: IIntentSlot[];
  /**
   * Array of utterances to match, including slots like {SlotName}
   */
  utterances: string[];
  /** The callback to run when the intent matches. */
  callback: ((...slots: (string | any)[]) => void) | ((data: any, ...slots: string[]) => void);
}