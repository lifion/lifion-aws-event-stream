'use strict';

const { Writable } = require('stream');

const index = require('.');
const samples = require('./index.test.json');

const { Parser, parse } = index;

function getSampleBuffer(key) {
  return Buffer.from(samples[key], 'hex');
}

describe('lib/index', () => {
  test('the module exports the expected', () => {
    expect(index).toEqual({
      Parser: expect.any(Function),
      parse: expect.any(Function)
    });
  });

  test('parse throws if called with no arguments', () => {
    expect(parse).toThrow('Expected a buffer with at least 16 bytes.');
  });

  test('parse is able to return an object from a buffer', () => {
    const sample = getSampleBuffer('noHeadersNoPayload');
    expect(parse(sample)).toEqual({ headers: {}, payload: '' });
  });

  test("parse throws if the total length doesn't matches the buffer length", () => {
    const sample = getSampleBuffer('badTotaLength');
    expect(() => parse(sample)).toThrow('Expected 1 bytes in the buffer but got 16.');
  });

  test("parse throws if the prelude checksum doesn't matches", () => {
    const sample = getSampleBuffer('badPreludeChecksum');
    expect(() => parse(sample)).toThrow('Prelude checksum error.');
  });

  test("parse throws if the message checksum doesn't matches", () => {
    const sample = getSampleBuffer('badMessageChecksum');
    expect(() => parse(sample)).toThrow('Message checksum error.');
  });

  test('parse successfully handles true boolean headers', () => {
    const sample = getSampleBuffer('trueBooleanHeader');
    expect(parse(sample)).toEqual({ headers: { foo: true }, payload: '' });
  });

  test('parse successfully handles false boolean headers', () => {
    const sample = getSampleBuffer('falseBooleanHeader');
    expect(parse(sample)).toEqual({ headers: { foo: false }, payload: '' });
  });

  test('parse successfully handles byte headers', () => {
    const sample = getSampleBuffer('byteHeader');
    expect(parse(sample)).toEqual({ headers: { foo: 255 }, payload: '' });
  });

  test('parse successfully handles short headers', () => {
    const sample = getSampleBuffer('shortHeader');
    expect(parse(sample)).toEqual({ headers: { foo: 65_535 }, payload: '' });
  });

  test('parse successfully handles integer headers', () => {
    const sample = getSampleBuffer('integerHeader');
    expect(parse(sample)).toEqual({ headers: { foo: 4_294_967_295 }, payload: '' });
  });

  test('parse successfully handles long headers', () => {
    const sample = getSampleBuffer('longHeader');
    expect(parse(sample)).toEqual({ headers: { foo: 281_474_976_710_655 }, payload: '' });
  });

  test('parse successfully handles bytes headers', () => {
    const sample = getSampleBuffer('bytesHeader');
    expect(parse(sample)).toEqual({ headers: { foo: Buffer.from([1, 2, 3, 4, 5]) }, payload: '' });
  });

  test('parse successfully handles string headers', () => {
    const sample = getSampleBuffer('stringHeader');
    expect(parse(sample)).toEqual({ headers: { foo: 'bar' }, payload: '' });
  });

  test('parse successfully handles date headers', () => {
    const sample = getSampleBuffer('dateHeader');
    expect(parse(sample)).toEqual({
      headers: { foo: new Date('2018-10-01T22:34:59.056Z') },
      payload: ''
    });
  });

  test('parse successfully handles UUID headers', () => {
    const sample = getSampleBuffer('uuidHeader');
    expect(parse(sample)).toEqual({
      headers: { foo: '3bfdac5c-fe6c-4029-83bf-c1de7819f531' },
      payload: ''
    });
  });

  test('parse throws if the header value type is unknown', () => {
    const sample = getSampleBuffer('unknownHeaderValueType');
    expect(() => parse(sample)).toThrow('Unknown header value type: 255');
  });

  test('parse returns a parsed object if the content-type is JSON', () => {
    const sample = getSampleBuffer('subscribeToShard');
    expect(parse(sample)).toEqual({
      headers: {
        ':content-type': 'application/json',
        ':event-type': 'SubscribeToShardEvent',
        ':message-type': 'event'
      },
      payload: {
        ContinuationSequenceNumber: '49588630796424512596616347529113745994736297474709782530',
        MillisBehindLatest: 0,
        Records: [
          {
            ApproximateArrivalTimestamp: 1_538_160_219.636,
            Data: 'V2VzbGV5',
            EncryptionType: null,
            PartitionKey: '10dcc902-c89c-4067-b436-05f88c0fb5ef',
            SequenceNumber: '49588630796424512596616347529113745994736297474709782530'
          }
        ]
      }
    });
  });

  test('Parser is able to transform the buffer and pipe it into an output stream', () => {
    return new Promise((resolve) => {
      const parser = new Parser();
      parser.pipe(
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            expect(chunk).toEqual({ headers: {}, payload: '' });
            expect(encoding).toBe('utf8');
            callback();
            resolve();
          }
        })
      );
      parser.write(getSampleBuffer('noHeadersNoPayload'));
    });
  });

  test('Parser emits the error thrown while decoding', () => {
    return new Promise((resolve) => {
      const parser = new Parser();
      parser.on('error', (err) => {
        expect(err.message).toEqual('Prelude checksum error.');
        resolve();
      });
      parser.write(getSampleBuffer('badPreludeChecksum'));
    });
  });
});
