import chai = require('chai');

const expect = chai.expect;

describe('a test', () => {
  it('should test', (done) => {
    expect(1).to.equal(1);
    done();
  });
});