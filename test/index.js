// Load modules

var Lab = require('lab');
var Hapi = require('hapi');
var Crumb = require('../');
var Stream = require('stream');
var Hoek = require('hoek');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Crumb', function () {

    var options = {
        views: {
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        }
    };

    it('returns view with crumb', function (done) {

        var server1 = new Hapi.Server(options);
        server1.route([
            {
                method: 'GET', path: '/1', handler: function (request, reply) {

                    expect(request.plugins.crumb).to.exist;
                    expect(request.server.plugins.crumb.generate).to.exist;

                    return reply.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST', path: '/2', handler: function (request, reply) {

                    expect(request.payload).to.deep.equal({ key: 'value' });
                    return reply('valid');
                }
            },
            {
                method: 'POST', path: '/3', config: { payload: { output: 'stream' } }, handler: function (request, reply) {

                    return reply('never');
                }
            },
            {
                method: 'GET', path: '/4', config: { plugins: { crumb: false } }, handler: function (request, reply) {

                    return reply.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST', path: '/5', config: { payload: { output: 'stream' } }, handler: function (request, reply) {

                    return reply('yo');
                }
            },
            {
                method: 'GET', path: '/6', handler: function (request, reply) {

                    return reply.view('index');
                }
            },
            {
                method: 'GET', path: '/7', handler: function (request, reply) {

                    return reply(null).redirect('/1');
                }
            }
        ]);

        server1.pack.register({ plugin: require('../'), options: { cookieOptions: { isSecure: true } } }, function (err) {

            expect(err).to.not.exist;
            server1.inject({ method: 'GET', url: '/1' }, function (res) {

                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');

                var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
                expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + cookie[1] + '</h2></div></body></html>');

                server1.inject({ method: 'POST', url: '/2', payload: '{ "key": "value", "crumb": "' + cookie[1] + '" }', headers: { cookie: 'crumb=' + cookie[1] } }, function (res) {

                    expect(res.result).to.equal('valid');

                    server1.inject({ method: 'POST', url: '/2', payload: '{ "key": "value", "crumb": "x' + cookie[1] + '" }', headers: { cookie: 'crumb=' + cookie[1] } }, function (res) {

                        expect(res.statusCode).to.equal(403);

                        server1.inject({ method: 'POST', url: '/3', headers: { cookie: 'crumb=' + cookie[1] } }, function (res) {

                            expect(res.statusCode).to.equal(403);

                            server1.inject({ method: 'GET', url: '/4' }, function (res) {

                                expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2></h2></div></body></html>');

                                var TestStream = function (opt) {

                                      Stream.Readable.call(this, opt);
                                      this._max = 2;
                                      this._index = 1;
                                };

                                Hoek.inherits(TestStream, Stream.Readable);

                                TestStream.prototype._read = function() {

                                    var i = this._index++;
                                    if (i > this._max)
                                        this.push(null);
                                    else {
                                        var str = '' + i;
                                        var buf = new Buffer(str, 'ascii');
                                        this.push(buf);
                                    }
                                };

                                server1.inject({ method: 'POST', url: '/5', payload: new TestStream(), headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="test.txt"' }, simulate: { end: true } }, function (res) {

                                    expect(res.statusCode).to.equal(403);

                                    server1.inject({method: 'GET', url: '/6'}, function(res) {

                                        var header = res.headers['set-cookie'];
                                        expect(header.length).to.equal(1);
                                        expect(header[0]).to.contain('Secure');

                                        var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
                                        expect(res.result).to.equal('<!DOCTYPE html><html><head><title></title></head><body><div><h1></h1><h2>' + cookie[1] + '</h2></div></body></html>');

                                    });
                                });

                                server1.inject({method: 'GET', url: '/7'}, function(res) {

                                    var cookie = res.headers['set-cookie'].toString();
                                    expect(cookie).to.contain('crumb');

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('Does not add crumb to view context when "addToViewContext" option set to false', function(done) {

        var server2 = new Hapi.Server(options);
        server2.route({
            method: 'GET', path: '/1', handler: function (request, reply) {

                expect(request.plugins.crumb).to.exist;
                expect(request.server.plugins.crumb.generate).to.exist;

                return reply.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        server2.pack.register({ plugin: require('../'), options: { cookieOptions: { isSecure: true }, addToViewContext: false } }, function (err) {

            expect(err).to.not.exist;
            server2.inject({ method: 'GET', url: '/1' }, function (res) {

                expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2></h2></div></body></html>');
                done();
            });
        });
    });

    it('Works without specifying plugin options', function(done) {

        var server3 = new Hapi.Server(options);
        server3.route({
            method: 'GET', path: '/1', handler: function (request, reply) {

                expect(request.plugins.crumb).to.exist;
                expect(request.server.plugins.crumb.generate).to.exist;

                return reply.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        server3.pack.register({ plugin: require('../'), options: null }, function (err) {

            expect(err).to.not.exist;

            server3.inject({ method: 'GET', url: '/1' }, function (res) {

                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);

                var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
                expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + cookie[1] + '</h2></div></body></html>');
                done();

            });
        });
    });

    it('route uses crumb when route.config.plugins.crumb set to true and autoGenerate set to false', function(done) {

        var server3 = new Hapi.Server(options);
        server3.route([
            {
                method: 'GET', path: '/1', handler: function (request, reply) {

                    var crumb = request.plugins.crumb;

                    expect(crumb).to.be.undefined;

                    return reply('bonjour');
                }
            },
            {
                method: 'GET', path: '/2', config: { plugins: { crumb: true } }, handler: function(request, reply) {

                    var crumb = request.plugins.crumb;

                    return reply('hola');
                }
            }
        ]);

        server3.pack.register({ plugin: require('../'), options: { autoGenerate: false } }, function (err) {

            expect(err).to.not.exist;

            server3.inject({ method: 'GET', url: '/1' }, function (res) {

                server3.inject({ method: 'GET', url: '/2'}, function (res) {

                    var header = res.headers['set-cookie'];
                    expect(header.length).to.equal(1);
                    var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

                    done();
                });
            });
        });
    });

    it('does not set crumb cookie insecurely', function(done) {
        var options = {
            cors: true
        }
        var server4 = new Hapi.Server(options);
        server4.route([
            {
                method: 'GET', path: '/1', handler: function (request, reply) {

                    return reply('test');
                }
            },
            {
                method: 'GET', path: '/2', handler: { proxy: { host: 'google.com', port: 443, protocol: 'https' } }
            }
        ]);
        server4.pack.register({ plugin: require('../'), options: null }, function (err) {
            expect(err).to.not.exist;
            var headers = {};
            headers['Origin'] = '127.0.0.1'
            server4.inject({ method: 'GET', url: '/1', headers: headers }, function (res) {

                var header = res.headers['set-cookie'];
                expect(header).to.not.contain('crumb');

                server4.inject({ method: 'GET', url: '/2'}, function (res) {

                    var header = res.headers['set-cookie'].toString();
                    var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
                    expect(cookie).to.be.null;

                    done();
                });
            });
        });
    });
});