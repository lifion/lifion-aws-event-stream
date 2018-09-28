'use strict';

const index = require('.');
const { samples } = require('./index.test.json');

const { parse } = index;

function getSampleBuffers() {
  return samples.map(i => Buffer.from(i.split(' ').map(j => parseInt(j, 16))));
}

describe('lib/index', () => {
  test('the module exports the expected', () => {
    expect(index).toEqual({
      Parser: expect.any(Function),
      parse: expect.any(Function)
    });
  });

  test('parse is able to succesfully handle the samples', async () => {
    getSampleBuffers().forEach(sampleBuffer => {
      expect(parse(sampleBuffer)).toEqual({
        headers: expect.any(Object),
        payload: expect.any(Object)
      });
    });
  });
});
