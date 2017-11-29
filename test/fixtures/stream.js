'use strict';

const Stream = require('stream');
const Hoek = require('hoek');

const TestStream = function (opt) {

    Stream.Readable.call(this, opt);
    this._max = 2;
    this._index = 1;
};

Hoek.inherits(TestStream, Stream.Readable);

TestStream.prototype._read = function () {

    const i = this._index++;
    if (i > this._max) {
        this.push(null);
    }
    else {
        const str = '' + i;
        const buf = new Buffer(str, 'ascii');
        this.push(buf);
    }
};

module.exports = TestStream;
