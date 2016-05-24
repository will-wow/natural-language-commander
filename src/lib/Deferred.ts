import promise = require('es6-promise');
const Promise = promise.Promise;

class Deferred {
  public resolve: Function;
  public reject: Function;
  public promise: promise.Promise<any>;

  constructor () {
    this.promise = new Promise ((resolve: Function, reject: Function) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export default Deferred;