// Load modules

var Lab = require('lab');
var Hapi = require('hapi');
var Crumb = require('../');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Crumb', function () {

    it('validates crumb with X-CSRF-Token header', function (done) {

        var options = {
            views: {
                path: __dirname + '/templates',
                engines: {
                    html: 'handlebars'
                }
            }
        };

        var server = new Hapi.Server(options);

        server.route([
            {
                method: 'GET', path: '/1', config: { plugins: { crumb: false } }, handler: function () {

                    expect(this.plugins.crumb).to.exist;
                    expect(this.server.plugins.crumb.generate).to.exist;

                    return this.reply.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST', path: '/2', handler: function () {

                    expect(this.payload).to.deep.equal({ key: 'value' });
                    return this.reply('valid');
                }
            },
            {
                method: 'POST', path: '/3', config: { payload: 'stream' }, handler: function () {

                    return this.reply('never');
                }
            },
            {
                method: 'PUT', path: '/4', handler: function () {

                    expect(this.payload).to.deep.equal({ key: 'value' });
                    return this.reply('valid');
                }
            },
            {
                method: 'PATCH', path: '/5', handler: function () {

                    expect(this.payload).to.deep.equal({ key: 'value' });
                    return this.reply('valid');
                }
            },
            {
                method: 'DELETE', path: '/6', handler: function () {

                    return this.reply('valid');
                }
            },
            {
                method: 'POST', path: '/7', config: { plugins: { crumb: false } }, handler: function () {

                    expect(this.payload).to.deep.equal({ key: 'value' });
                    return this.reply('valid');
                }
            },

        ]);

        server.pack.allow({ ext: true }).require('../', { restful: true, cookieOptions: { isSecure: true } }, function (err) {

            expect(err).to.not.exist;
            server.inject({ method: 'GET', url: '/1' }, function (res) {

                var header = res.headers['set-cookie'];
                expect(header.length).to.equal(1);
                expect(header[0]).to.contain('Secure');

                var cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

                var validHeader = {};
                validHeader['cookie'] = 'crumb=' + cookie[1];
                validHeader['x-csrf-token'] = cookie[1];

                var invalidHeader = {};
                invalidHeader['cookie'] = 'crumb=' + cookie[1];
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


