/**
 * Node.js parser for the application/vnd.amazon.eventstream content-type.
 *
 * @module lifion-aws-event-stream
 */

'use strict';

const { Transform } = require('stream');
const { crc32 } = require('crc');

const types = Object.freeze({
  BOOL_TRUE: 0,
  BOOL_FALSE: 1,
  BYTE: 2,
  SHORT: 3,
  INTEGER: 4,
  LONG: 5,
  BYTES: 6,
  STRING: 7,
  TIMESTAMP: 8,
  UUID: 9
});

const JSON_REGEX = /^application\/.*json.*$/;

function parse(buffer) {
  let offset = 0;

  // The prelude plus the context checksum are required for parsing.
  const { length = 0 } = buffer || {};
  if (length < 16) throw new Error('Expected a buffer with at least 16 bytes.');

  // Check that the length of the buffer matches the expected.
  const totalLength = buffer.readUInt32BE(offset);
  if (length !== totalLength)
    throw new Error(`Expected ${totalLength} bytes in the buffer but got ${length}.`);
  offset += 4;

  // Extract the headers length.
  const headersLength = buffer.readUInt32BE(offset);
  offset += 4;

  // Validate the prelude checksum (using: total length + headers length).
  let checksum = buffer.readUInt32BE(offset);
  let calculatedChecksum = crc32(buffer.slice(0, 8));
  if (checksum !== calculatedChecksum) throw new Error('Prelude checksum error.');
  offset += 4;

  // Validate the message checksum (using: entire message - checksum at the end).
  checksum = buffer.readUInt32BE(length - 4);
  calculatedChecksum = crc32(buffer.slice(0, length - 4));
  if (checksum !== calculatedChecksum) throw new Error('Message checksum error.');

  // Parse the headers.
  const headers = {};
  const headersEnd = offset + headersLength;
  while (offset < headersEnd) {
    // The header key length is first.
    const keyLength = buffer.readUInt8(offset);
    offset += 1;

    // Extract the header key name.
    const key = buffer.slice(offset, offset + keyLength).toString('utf8');
    offset += keyLength;

    // Figure out the header value type.
    const valueType = buffer.readUInt8(offset);
    offset += 1;

    // Extract the header value.
    let value;
    let valueLength;
    switch (valueType) {
      // Boolean types don't have a value specified.
      case types.BOOL_FALSE:
      case types.BOOL_TRUE:
        value = valueType === types.BOOL_TRUE;
        break;

      // Bytes are 1 octect long.
      case types.BYTE:
        value = buffer.readUInt8(offset);
        offset += 1;
        break;

      // Shorts are 2 octects.
      case types.SHORT:
        value = buffer.readUInt16BE(offset);
        offset += 2;
        break;

      // Integers are 4 octects.
      case types.INTEGER:
        value = buffer.readUInt32BE(offset);
        offset += 4;
        break;

      // Longs are 8 octects.
      case types.LONG:
        value = parseInt(
          buffer.slice(offset, offset + 4).toString('hex') +
            buffer.slice(offset + 4, offset + 8).toString('hex'),
          16
        );
        offset += 8;
        break;

      // Extract the given length as a new buffer.
      case types.BYTES:
        valueLength = buffer.readUInt16BE(offset);
        offset += 2;
        value = Buffer.from(buffer.slice(offset, offset + valueLength));
        offset += valueLength;
        break;

      // Extract the given length as an Unicode string.
      case types.STRING:
        valueLength = buffer.readUInt16BE(offset);
        offset += 2;
        value = buffer.slice(offset, offset + valueLength).toString('utf8');
        offset += valueLength;
        break;

      // Timestamps are stored as integers.
      case types.TIMESTAMP:
        value = new Date(
          parseInt(
            buffer.slice(offset, offset + 4).toString('hex') +
              buffer.slice(offset + 4, offset + 8).toString('hex'),
            16
          )
        );
        offset += 8;
        break;

      // UUIDs are to be parsed as formatted hex strings.
      case types.UUID:
        value = buffer.slice(offset, offset + 16).toString('hex');
        value = [
          value.substr(0, 8),
          value.substr(8, 4),
          value.substr(12, 4),
          value.substr(16, 4),
          value.substr(20)
        ].join('-');
        offset += 16;
        break;

      default:
        throw new Error(`Unknown header value type: ${valueType}`);
    }

    // Store the header.
    headers[key] = value;
  }

  // Extract the payload.
  let payload = buffer.slice(offset, length - 4).toString('utf8');
  const contentType = headers[':content-type'];
  if (contentType && JSON_REGEX.test(contentType)) payload = JSON.parse(payload);

  return { headers, payload };
}

class Parser extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk, encoding, callback) {
    try {
      this.push(parse(chunk));
    } catch (err) {
      this.emit('error', err);
    }
    callback();
  }
}

module.exports = { Parser, parse };
