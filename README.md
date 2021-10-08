# lifion-aws-event-stream

Node.js parser for binary streams under the **application/vnd.amazon.eventstream** content-type.

## Getting Started

To install the module:

```sh
npm install lifion-aws-event-stream --save
```

The module exports a [parse](#module_lifion-aws-event-stream.parse) function and a [Parser](#module_lifion-aws-event-stream.Parser) stream. To use the [parse](#module_lifion-aws-event-stream.parse) function:

```js
const { parse } = require('lifion-aws-event-stream');

const buffer = Buffer.from('000000100000000005c248eb7d98c8ff', 'hex');
console.log(parse(buffer)); // { headers: {}, payload: '' }
```

To use the [Parser](#module_lifion-aws-event-stream.Parser) stream:

```js
const { Parser } = require('lifion-aws-event-stream');

const parser = new Parser();
parser.on('data', console.log); // { headers: {}, payload: '' }

const buffer = Buffer.from('000000100000000005c248eb7d98c8ff', 'hex');
parser.write(buffer);
```

Pipe an HTTP response to parse the messages as they arrive:

```js
const got = require('got');
const { Parser } = require('lifion-aws-event-stream');
const { pipeline } = require('stream');

pipeline([
  got('/', …),
  new Parser(),
  new Writable({
    objectMode: true,
    write(data, encoding, callback) {
      console.log(data);
      callback();
    }
  }),
]);
```

This project's implementation is based on:

- https://github.com/aws/aws-sdk-ruby/tree/master/gems/aws-eventstream
- https://github.com/awslabs/aws-c-event-stream

## API Reference

- [lifion-aws-event-stream](#module_lifion-aws-event-stream)
  - _global_
    - [Parser](#Parser) ⇐ <code>Transform</code>
  - _static_
    - [.parse(buffer)](#module_lifion-aws-event-stream.parse) ⇒ <code>Object</code>

<a name="Parser"></a>

### lifion-aws-event-streamParser ⇐ <code>Transform</code>

A transform stream that calls parse with the binary data written to it. Can be used to pipe
a response stream from an AWS service HTTP request. The stream will emit errors thrown during
parse calls.

**Kind**: global class of [<code>lifion-aws-event-stream</code>](#module_lifion-aws-event-stream)  
**Extends**: <code>Transform</code>  
**See**: https://nodejs.org/dist/latest-v10.x/docs/api/stream.html#stream_class_stream_transform  
<a name="module_lifion-aws-event-stream.parse"></a>

### eventStream.parse(buffer) ⇒ <code>Object</code>

Parses the specified buffer with vnd.amazon.eventstream data into an object.

**Kind**: static method of [<code>lifion-aws-event-stream</code>](#module_lifion-aws-event-stream)  
**Returns**: <code>Object</code> - The parsed vnd.amazon.eventstream object.  
**Throws**:

- <code>Error</code> Whenever:
  - The specified buffer has less than 16 bytes. The minimum vnd.amazon.eventstream message
    should have 4 bytes for the total length of the package, 4 bytes for the length of the
    headers section, 4 bytes for the checksum of the prelude, and finally 4 more bytes for
    the checksum of the entire message.
  - The total length as specified in the message doesn't matches the bufffer length.
  - The checksum of the prelude doesn't matches the calculated checksum.
  - The checksum of the message doesn't matches the calculated checksum.
  - The header value type is unknown.

| Param  | Type                | Description          |
| ------ | ------------------- | -------------------- |
| buffer | <code>Buffer</code> | The buffer to parse. |

## License

[Apache-2.0](./LICENSE)
