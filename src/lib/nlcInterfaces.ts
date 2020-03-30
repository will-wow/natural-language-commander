export interface SlotTypeFunction {
  (message: string): any;
}

export type SlotTypeItem = string | string[] | RegExp | SlotTypeFunction;

/** A slot type to be used in intents. */
export interface ISlotType {
  /** The slot type name. */
  type: string;
  /** The associated options */
  matcher: SlotTypeItem;
  /** The first-round matcher for the regex. */
  baseMatcher?: string;
}

/** A slot to associate with an intent. */
export interface IIntentSlot {
  /** The name used in the associated utterances. */
  name: string;
  /** The slot type. */
  type: string;
  dialog?: {
    prompt: string[];
    confirm: string[];
    utterances: string[];
  };
  required?: boolean;
}

/** An intent, to be passed to NLC. */
export interface IIntent {
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
}

export interface ISlotFullfilment {
  name: string;
  value?: string;
}

export interface IIntentFullfilment {
  intent: string;
  slots: ISlotFullfilment[];
  required?: IIntentSlot[];
}