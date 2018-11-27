'use strict';

const Stream = require('stream');
const Util = require('util');

const TestStream = function (opt) {

    Stream.Readable.call(this, opt);
    this._max = 2;
    this._index = 1;
};

Util.inherits(TestStream, Stream.Readable);

TestStream.prototype._read = function () {

    const i = this._index++;
    if (i > this._max) {
        this.push(null);
    }
    else {
        const str = '' + i;
        const buf = Buffer.from(str, 'ascii');
        this.push(buf);
    }
};

module.exports = TestStream;
