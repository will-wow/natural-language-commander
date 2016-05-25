// Type definitions for chai-spies 0.7.1
// Project: http://chaijs.com/
// Definitions by: Will Lee-Wagner <whentheresawill.net/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module Chai {
  interface ChaiSpy {
    (): any
    on(object: any, ...args: string[])
    object(spies: string[])
    returns(value: any);
  }
  
  interface ChaiStatic {
    spy: ChaiSpy;
  }
  
  interface SpyCalledWith {
    (...args: any[]): void;
    exactly(...args: any[]): void;
  }
  
  interface SpyCalledAlways {
    with: SpyCalledWith;
  }
  
  interface SpyCalledAt {
    most(n: number): void;
    least(n: number): void;
  }
  
  interface SpyCalled {
    (): void;
    with: SpyCalledWith;
    always: SpyCalledAlways;
    once: any;
    twice: any;
    exactly(n: number): void;
    min(n: number): void;
    max(n: number): void;
    at: SpyCalledAt;
    above(n: number): void;
    gt(n: number): void;
    below(n: number): void;
    lt(n: number): void;
  }
  
  interface Assertion {
    called: SpyCalled;
    spy: any
  }
}