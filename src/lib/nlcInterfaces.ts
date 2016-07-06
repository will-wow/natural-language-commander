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
  /** The callback to run when the intent matches. */
  callback: ((...slotValues: any[]) => void) | ((data: any, ...slotValues: any[]) => void);
}

export interface IQuestionIntent {
  /** The question intent name. */
  intent: string;
  /** The slot type the question is asking for. */
  slotType: string;
  /**
   * Array of utterances to match. Slots must be named {Slot}.
   * Defaults to checking for just the slot. 
   */
  utterances?: string[];
  /**
   * Asks the question. Called before setting up the answer listener.
   * @param data - Any arbitrary data passed to nlc.ask(). Defaults to the userId.
   * @param slotValue - The transformed value of the answer's slot.
   */
  questionCallback: (data: any) => void;
  /**
   * Called on sucessful match.
   * @param data - Any arbitrary data passed to nlc.ask(). Defaults to the userId.
   * @param slotValue - The transformed value of the answer's slot.
   */
  successCallback: (userId: any, slotValue: any) => void;
  /**
   * Called when the slot didn't match.
   * @param data - Any arbitrary data passed to nlc.ask(). Defaults to the userId.
   */
  failCallback: (userId: any) => void;
  /**
   * If specified, NLC will listen for commands like "nevermind" or "cancel",
   * and call this if the command matches them.
   * @param data - Any arbitrary data passed to nlc.ask(). Defaults to the userId.
   */
  cancelCallback?: (userId: any) => void;
}

export interface IHandleCommandOptions {
  command: string;
  data?: any;
  userId?: string;
}

export interface IAskOptions {
  question: string;
  data?: any;
  userId?: string;
}
