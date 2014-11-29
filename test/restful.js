// Load modules

var Code = require('code');
var Crumb = require('../');
var Hapi = require('hapi');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Crumb', function () {

    it('validates crumb with X-CSRF-Token header', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.views({
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        });

        server.route([
            {
                method: 'GET', path: '/1', handler: function (request, reply) {

                    expect(request.plugins.crumb).to.exist();
                    expect(request.connection.plugins.crumb.generate).to.exist();

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
                method: 'PUT', path: '/4', handler: function (request, reply) {

                    expect(request.payload).to.deep.equal({ key: 'value' });
                    return reply('valid');
                }
            },
            {
                method: 'PATCH', path: '/5', handler: function (request, reply) {

                    expect(request.payload).to.deep.equal({ key: 'value' });
                    return reply('valid');
                }
            },
            {
                method: 'DELETE', path: '/6', handler: function (request, reply) {

                    return reply('valid');
                }
            },
            {
                method: 'POST', path: '/7', config: { plugins: { crumb: false } }, handler: function (request, reply) {

                    expect(request.payload).to.deep.equal({ key: 'value' });
                    return reply('valid');
                }
            },
            {
                method: 'POST', path: '/8', config: { plugins: { crumb: { restful: false, source: 'payload' } } }, handler: function (request, reply) {

                    expect(request.payload).to.deep.equal({ key: 'value' });
                    return reply('valid');
                }
            }

        ]);

        server.register({ register: Crumb, options: { restful: true, cookieOptions: { isSecure: true } } }, function (err) {

            expect(err).to.not.exist();
            server.inject({ method: 'GET', url: '/1' }, function (res) {

                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');

                var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

                var validHeader = {};
                validHeader.cookie = 'crumb=' + cookie[1];
                validHeader['x-csrf-token'] = cookie[1];

                var invalidHeader = {};
                invalidHeader.cookie = 'crumb=' + cookie[1];
                invalidHeader['x-csrf-token'] = 'x' + cookie[1];

                expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + cookie[1] + '</h2></div></body></html>');

                server.inject({ method: 'POST', url: '/2', payload: '{ "key": "value" }', headers: validHeader }, function (res) {

                    expect(res.result).to.equal('valid');

                    server.inject({ method: 'POST', url: '/2', payload: '{ "key": "value" }', headers: invalidHeader }, function (res) {

                        expect(res.statusCode).to.equal(403);

                        server.inject({ method: 'POST', url: '/3', headers: { cookie: 'crumb=' + cookie[1] } }, function (res) {

                            expect(res.statusCode).to.equal(403);

                            server.inject({ method: 'PUT', url: '/4', payload: '{ "key": "value" }', headers: validHeader }, function (res) {

                                expect(res.result).to.equal('valid');

                                server.inject({ method: 'PUT', url: '/4', payload: '{ "key": "value" }', headers: invalidHeader }, function (res) {

                                    expect(res.statusCode).to.equal(403);

                                    server.inject({ method: 'PATCH', url: '/5', payload: '{ "key": "value" }', headers: validHeader }, function (res) {

                                        expect(res.result).to.equal('valid');

                                        server.inject({ method: 'PATCH', url: '/5', payload: '{ "key": "value" }', headers: invalidHeader }, function (res) {

                                            expect(res.statusCode).to.equal(403);

                                            server.inject({ method: 'DELETE', url: '/6', headers: validHeader }, function (res) {

                                                expect(res.result).to.equal('valid');

                                                server.inject({ method: 'DELETE', url: '/6', headers: invalidHeader }, function (res) {

                                                    expect(res.statusCode).to.equal(403);

                                                    server.inject({ method: 'POST', url: '/7', payload: '{ "key": "value" }' }, function (res) {

                                                        expect(res.result).to.equal('valid');

                                                        var payload = { key: 'value', crumb: cookie[1] };

                                                        delete validHeader['x-csrf-token'];
                                                        server.inject({ method: 'POST', url: '/8', payload: JSON.stringify(payload), headers: validHeader }, function (res) {

                                                            expect(res.result).to.equal('valid');
                                                            done();
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
