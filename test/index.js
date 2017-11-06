'use strict';

// Load modules

const Stream = require('stream');
const Code = require('code');
const Crumb = require('../');
const Hapi = require('hapi');
const Lab = require('lab');
const Hoek = require('hoek');


// Declare internals

const internals = {};


// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;
const Vision = require('vision');


describe('Crumb', () => {

    it('returns view with crumb', async () => {

        const server = new Hapi.Server();

        const viewOptions = {
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        };

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    expect(request.plugins.crumb).to.exist();
                    expect(request.server.plugins.crumb.generate).to.exist();

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST', path: '/2', handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST', path: '/3', options: { payload: { output: 'stream' } }, handler: (request, h) => {

                    return 'never';
                }
            },
            {
                method: 'GET', path: '/4', options: { plugins: { crumb: false } }, handler: (request, h) => {

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST', path: '/5', options: { payload: { output: 'stream' } }, handler: (request, h) => {

                    return 'yo';
                }
            },
            {
                method: 'GET', path: '/6', handler: (request, h) => {

                    return h.view('index');
                }
            },
            {
                method: 'GET', path: '/7', handler: (request, h) => {

                    return h.redirect('/1');
                }
            }
        ]);

        try {
            await server.register([Vision, { plugin: Crumb, options: { cookieOptions: { isSecure: true } } }]);
        }
        catch (err) {
            // console.log(err);
            expect(err).to.not.exist();

            return;
        }

        server.views(viewOptions);

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.statusCode).to.equal(200);

        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
        expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + cookie[1] + '</h2></div></body></html>');

        const res2 = await server.inject({ method: 'POST', url: '/2', payload: '{ "key": "value", "crumb": "' + cookie[1] + '" }', headers: { cookie: 'crumb=' + cookie[1] } });

        expect(res2.result).to.equal('valid');

        const res3 = await server.inject({ method: 'POST', url: '/2', payload: '{ "key": "value", "crumb": "x' + cookie[1] + '" }', headers: { cookie: 'crumb=' + cookie[1] } });

        expect(res3.statusCode).to.equal(403);

        const res4 = await server.inject({ method: 'POST', url: '/3', headers: { cookie: 'crumb=' + cookie[1] } });

        expect(res4.statusCode).to.equal(403);

        const res5 = await server.inject({ method: 'GET', url: '/4' });

        expect(res5.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2></h2></div></body></html>');

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

        const res6 = await server.inject({ method: 'POST', url: '/5', payload: new TestStream(), headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="test.txt"' }, simulate: { end: true } });

        expect(res6.statusCode).to.equal(403);

        const res7 = await server.inject({ method: 'GET', url: '/6' });

        const header2 = res7.headers['set-cookie'];
        expect(header2.length).to.equal(1);
        expect(header2[0]).to.contain('Secure');

        const cookie2 = header2[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
        expect(res7.result).to.equal('<!DOCTYPE html><html><head><title></title></head><body><div><h1></h1><h2>' + cookie2[1] + '</h2></div></body></html>');

        const res8 = await server.inject({ method: 'GET', url: '/7' });

        const cookie3 = res8.headers['set-cookie'].toString();
        expect(cookie3).to.contain('crumb');

        const headers = {};
        headers.origin = 'http://127.0.0.1';

        const res9 = await server.inject({ method: 'GET', url: '/1', headers });

        const cookie4 = res9.headers['set-cookie'].toString();
        expect(cookie4).to.contain('crumb');
    });

    it('Does not add crumb to view context when "addToViewContext" option set to false', async () => {

        const server = new Hapi.Server();

        const viewOptions = {
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        };

        server.route({
            method: 'GET', path: '/1', handler: (request, h) => {

                expect(request.plugins.crumb).to.exist();
                expect(request.server.plugins.crumb.generate).to.exist();

                return h.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        try {
            await server.register([Vision, { plugin: Crumb, options: { cookieOptions: { isSecure: true }, addToViewContext: false } }]);
            server.views(viewOptions);

            const res = await server.inject({ method: 'GET', url: '/1' });

            expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2></h2></div></body></html>');
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('Works without specifying plugin options', async () => {

        const server = new Hapi.Server();

        const viewOptions = {
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        };

        server.route({
            method: 'GET', path: '/1', handler: (request, h) => {

                expect(request.plugins.crumb).to.exist();
                expect(request.server.plugins.crumb.generate).to.exist();

                return h.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        try {
            await server.register([Vision, Crumb]);

            server.views(viewOptions);

            const res = await server.inject({ method: 'GET', url: '/1' });

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);

            const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
            expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + cookie[1] + '</h2></div></body></html>');
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('should fail to register with bad options', async () => {

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Crumb,
                options: {
                    foo: 'bar'
                }
            });
        }
        catch (err) {
            expect(err).to.exist();
            expect(err.name).to.equal('ValidationError');
            // TODO: Message validation fails because of formatting produced by assert :(
            // expect(err.message).to.equal('"foo" is not allowed');
        }
    });

    it('route uses crumb when route.options.plugins.crumb set to true and autoGenerate set to false', async () => {

        const server = new Hapi.Server();

        const viewOptions = {
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        };

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    const crumb = request.plugins.crumb;

                    expect(crumb).to.not.exist();

                    return 'bonjour';
                }
            },
            {
                method: 'GET', path: '/2', options: { plugins: { crumb: true } }, handler: (request, h) => {

                    return 'hola';
                }
            }
        ]);

        try {
            await server.register([Vision, { plugin: Crumb, options: { autoGenerate: false } }]);

            server.views(viewOptions);

            await server.inject({ method: 'GET', url: '/1' });
            const res = await server.inject({ method: 'GET', url: '/2' });

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('fails validation when no payload provided and not using restful mode', async () => {

        const server = new Hapi.Server();
        server.route([
            {
                method: 'POST', path: '/1', handler: (request, h) => {

                    return 'test';
                }
            }
        ]);

        try {
            await server.register([Crumb]);

            const headers = {};
            headers['X-API-Token'] = 'test';

            const res = await server.inject({ method: 'POST', url: '/1', headers });

            expect(res.statusCode).to.equal(403);
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('does not validate crumb when "skip" option returns true', async () => {

        const server = new Hapi.Server();
        server.route([
            {
                method: 'POST', path: '/1', handler: (request, h) => {

                    return 'test';
                }
            }
        ]);

        const skip = (request) => {

            return request.headers['x-api-token'] === 'test';
        };

        try {
            await server.register([{ plugin: Crumb, options: { skip } }]);

            const headers = {};
            headers['X-API-Token'] = 'test';

            const res = await server.inject({ method: 'POST', url: '/1', headers });
            const header = res.headers['set-cookie'];

            expect(res.statusCode).to.equal(200);
            expect(header).to.not.exist();
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('ensures crumb "skip" option is a function', async () => {

        const server = new Hapi.Server();
        server.route([
            {
                method: 'POST', path: '/1', handler: (request, h) => {

                    return 'test';
                }
            }
        ]);

        const skip = true;

        try {
            await server.register([Vision, { plugin: Crumb, options: { skip } }]);
        }
        catch (err) {
            expect(err).to.exist();
        }
    });

    it('does not set crumb cookie insecurely', async () => {

        const server = new Hapi.Server({ host: 'localhost', port: 80, routes: { cors: true } });
        server.route({ method: 'GET', path: '/1', options: { cors: false }, handler: (request, h) => {

            return 'test';
        } });
        server.route({ method: 'GET', path: '/2', handler: (request, h) => {

            return 'test';
        } });
        server.route({ method: 'GET', path: '/3', options: { cors: { origin: ['http://127.0.0.1'] } }, handler: (request, h) => {

            return 'test';
        } });

        try {
            await server.register(Crumb);

            const headers = {};

            const res = await server.inject({ method: 'GET', url: '/1', headers });

            const header = res.headers['set-cookie'];
            expect(header[0]).to.contain('crumb');

            headers.origin = 'http://localhost';

            const res2 = await server.inject({ method: 'GET', url: '/2', headers });

            const header2 = res2.headers['set-cookie'];
            expect(header2[0]).to.contain('crumb');

            headers.origin = 'http://127.0.0.1';

            const res3 = await server.inject({ method: 'GET', url: '/3', headers });
            const header3 = res3.headers['set-cookie'];

            expect(header3[0]).to.contain('crumb');

            const res4 = await server.inject({ method: 'GET', url: '/3' });
            const header4 = res4.headers['set-cookie'];

            expect(header4[0]).to.contain('crumb');

            headers.origin = 'http://badsite.com';

            const res5 = await server.inject({ method: 'GET', url: '/3', headers });

            const header5 = res5.headers['set-cookie'];
            expect(header5).to.not.exist();
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('does not set crumb cookie insecurely using https', async () => {

        const options = {
            host: 'localhost',
            port: 443,
            tls: {
                key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0UqyXDCqWDKpoNQQK/fdr0OkG4gW6DUafxdufH9GmkX/zoKz\ng/SFLrPipzSGINKWtyMvo7mPjXqqVgE10LDI3VFV8IR6fnART+AF8CW5HMBPGt/s\nfQW4W4puvBHkBxWSW1EvbecgNEIS9hTGvHXkFzm4xJ2e9DHp2xoVAjREC73B7JbF\nhc5ZGGchKw+CFmAiNysU0DmBgQcac0eg2pWoT+YGmTeQj6sRXO67n2xy/hA1DuN6\nA4WBK3wM3O4BnTG0dNbWUEbe7yAbV5gEyq57GhJIeYxRvveVDaX90LoAqM4cUH06\n6rciON0UbDHV2LP/JaH5jzBjUyCnKLLo5snlbwIDAQABAoIBAQDJm7YC3pJJUcxb\nc8x8PlHbUkJUjxzZ5MW4Zb71yLkfRYzsxrTcyQA+g+QzA4KtPY8XrZpnkgm51M8e\n+B16AcIMiBxMC6HgCF503i16LyyJiKrrDYfGy2rTK6AOJQHO3TXWJ3eT3BAGpxuS\n12K2Cq6EvQLCy79iJm7Ks+5G6EggMZPfCVdEhffRm2Epl4T7LpIAqWiUDcDfS05n\nNNfAGxxvALPn+D+kzcSF6hpmCVrFVTf9ouhvnr+0DpIIVPwSK/REAF3Ux5SQvFuL\njPmh3bGwfRtcC5d21QNrHdoBVSN2UBLmbHUpBUcOBI8FyivAWJhRfKnhTvXMFG8L\nwaXB51IZAoGBAP/E3uz6zCyN7l2j09wmbyNOi1AKvr1WSmuBJveITouwblnRSdvc\nsYm4YYE0Vb94AG4n7JIfZLKtTN0xvnCo8tYjrdwMJyGfEfMGCQQ9MpOBXAkVVZvP\ne2k4zHNNsfvSc38UNSt7K0HkVuH5BkRBQeskcsyMeu0qK4wQwdtiCoBDAoGBANF7\nFMppYxSW4ir7Jvkh0P8bP/Z7AtaSmkX7iMmUYT+gMFB5EKqFTQjNQgSJxS/uHVDE\nSC5co8WGHnRk7YH2Pp+Ty1fHfXNWyoOOzNEWvg6CFeMHW2o+/qZd4Z5Fep6qCLaa\nFvzWWC2S5YslEaaP8DQ74aAX4o+/TECrxi0z2lllAoGAdRB6qCSyRsI/k4Rkd6Lv\nw00z3lLMsoRIU6QtXaZ5rN335Awyrfr5F3vYxPZbOOOH7uM/GDJeOJmxUJxv+cia\nPQDflpPJZU4VPRJKFjKcb38JzO6C3Gm+po5kpXGuQQA19LgfDeO2DNaiHZOJFrx3\nm1R3Zr/1k491lwokcHETNVkCgYBPLjrZl6Q/8BhlLrG4kbOx+dbfj/euq5NsyHsX\n1uI7bo1Una5TBjfsD8nYdUr3pwWltcui2pl83Ak+7bdo3G8nWnIOJ/WfVzsNJzj7\n/6CvUzR6sBk5u739nJbfgFutBZBtlSkDQPHrqA7j3Ysibl3ZIJlULjMRKrnj6Ans\npCDwkQKBgQCM7gu3p7veYwCZaxqDMz5/GGFUB1My7sK0hcT7/oH61yw3O8pOekee\nuctI1R3NOudn1cs5TAy/aypgLDYTUGQTiBRILeMiZnOrvQQB9cEf7TFgDoRNCcDs\nV/ZWiegVB/WY7H0BkCekuq5bHwjgtJTpvHGqQ9YD7RhE8RSYOhdQ/Q==\n-----END RSA PRIVATE KEY-----\n',
                cert: '-----BEGIN CERTIFICATE-----\nMIIDBjCCAe4CCQDvLNml6smHlTANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJV\nUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMB4XDTE0MDEyNTIxMjIxOFoXDTE1MDEyNTIxMjIxOFowRTELMAkG\nA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0\nIFdpZGdpdHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\nANFKslwwqlgyqaDUECv33a9DpBuIFug1Gn8Xbnx/RppF/86Cs4P0hS6z4qc0hiDS\nlrcjL6O5j416qlYBNdCwyN1RVfCEen5wEU/gBfAluRzATxrf7H0FuFuKbrwR5AcV\nkltRL23nIDRCEvYUxrx15Bc5uMSdnvQx6dsaFQI0RAu9weyWxYXOWRhnISsPghZg\nIjcrFNA5gYEHGnNHoNqVqE/mBpk3kI+rEVzuu59scv4QNQ7jegOFgSt8DNzuAZ0x\ntHTW1lBG3u8gG1eYBMquexoSSHmMUb73lQ2l/dC6AKjOHFB9Ouq3IjjdFGwx1diz\n/yWh+Y8wY1Mgpyiy6ObJ5W8CAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAoSc6Skb4\ng1e0ZqPKXBV2qbx7hlqIyYpubCl1rDiEdVzqYYZEwmst36fJRRrVaFuAM/1DYAmT\nWMhU+yTfA+vCS4tql9b9zUhPw/IDHpBDWyR01spoZFBF/hE1MGNpCSXXsAbmCiVf\naxrIgR2DNketbDxkQx671KwF1+1JOMo9ffXp+OhuRo5NaGIxhTsZ+f/MA4y084Aj\nDI39av50sTRTWWShlN+J7PtdQVA5SZD97oYbeUeL7gI18kAJww9eUdmT0nEjcwKs\nxsQT1fyKbo7AlZBY4KSlUMuGnn0VnAsB9b+LxtXlDfnjyM8bVQx1uAfRo0DO8p/5\n3J5DTjAU55deBQ==\n-----END CERTIFICATE-----\n'
            }
        };

        const server = new Hapi.Server(options);
        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    return 'test';
                }
            }
        ]);

        try {
            await server.register(Crumb);

            const res = await server.inject({ method: 'GET', url: '/1', headers: { host: 'localhost:443' } });

            const header = res.headers['set-cookie'];
            expect(header[0]).to.contain('crumb');
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });

    it('validates crumb with X-CSRF-Token header', async () => {

        const server = new Hapi.Server();

        const viewOptions = {
            path: __dirname + '/templates',
            engines: {
                html: require('handlebars')
            }
        };

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    expect(request.plugins.crumb).to.exist();
                    expect(request.server.plugins.crumb.generate).to.exist();

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST', path: '/2', handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST', path: '/3', options: { payload: { output: 'stream' } }, handler: (request, h) => {

                    return 'never';
                }
            },
            {
                method: 'PUT', path: '/4', handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'PATCH', path: '/5', handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'DELETE', path: '/6', handler: (request, h) => {

                    return 'valid';
                }
            },
            {
                method: 'POST', path: '/7', options: { plugins: { crumb: false } }, handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST', path: '/8', options: { plugins: { crumb: { restful: false, source: 'payload' } } }, handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            }

        ]);

        try {
            await server.register([Vision, { plugin: Crumb, options: { restful: true, cookieOptions: { isSecure: true } } }]);

            server.views(viewOptions);

            const res = await server.inject({ method: 'GET', url: '/1' });

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);
            expect(header[0]).to.contain('Secure');

            const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

            const validHeader = {};
            validHeader.cookie = 'crumb=' + cookie[1];
            validHeader['x-csrf-token'] = cookie[1];

            const invalidHeader = {};
            invalidHeader.cookie = 'crumb=' + cookie[1];
            invalidHeader['x-csrf-token'] = 'x' + cookie[1];

            expect(res.result).to.equal('<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + cookie[1] + '</h2></div></body></html>');

            const res2 = await server.inject({ method: 'POST', url: '/2', payload: '{ "key": "value" }', headers: validHeader });

            expect(res2.result).to.equal('valid');

            const res3 = await server.inject({ method: 'POST', url: '/2', payload: '{ "key": "value" }', headers: invalidHeader });

            expect(res3.statusCode).to.equal(403);

            const res4 = await server.inject({ method: 'POST', url: '/3', headers: { cookie: 'crumb=' + cookie[1] } });

            expect(res4.statusCode).to.equal(403);

            const res5 = await server.inject({ method: 'PUT', url: '/4', payload: '{ "key": "value" }', headers: validHeader });

            expect(res5.result).to.equal('valid');

            const res6 = await server.inject({ method: 'PUT', url: '/4', payload: '{ "key": "value" }', headers: invalidHeader });

            expect(res6.statusCode).to.equal(403);

            const res7 = await server.inject({ method: 'PATCH', url: '/5', payload: '{ "key": "value" }', headers: validHeader });

            expect(res7.result).to.equal('valid');

            const res8 = await server.inject({ method: 'PATCH', url: '/5', payload: '{ "key": "value" }', headers: invalidHeader });

            expect(res8.statusCode).to.equal(403);

            const res9 = await server.inject({ method: 'DELETE', url: '/6', headers: validHeader });

            expect(res9.result).to.equal('valid');

            const res10 = await server.inject({ method: 'DELETE', url: '/6', headers: invalidHeader });

            expect(res10.statusCode).to.equal(403);

            const res11 = await server.inject({ method: 'POST', url: '/7', payload: '{ "key": "value" }' });

            expect(res11.result).to.equal('valid');

            const payload = { key: 'value', crumb: cookie[1] };

            delete validHeader['x-csrf-token'];

            const res12 = await server.inject({ method: 'POST', url: '/8', payload: JSON.stringify(payload), headers: validHeader });

            expect(res12.statusCode).to.equal(200);
        }
        catch (err) {
            expect(err).to.not.exist();
        }
    });
});
