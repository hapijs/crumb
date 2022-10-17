'use strict';

const Stream = require('stream');

const Code = require('@hapi/code');
const Crumb = require('..');
const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const Vision = require('@hapi/vision');

const TLSCert = require('./fixtures/cert');
const Views = require('./fixtures/views');


const internals = {};


const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

internals.viewOptions = {
    path: __dirname + '/templates',
    engines: {
        html: require('handlebars')
    }
};


describe('Crumb', () => {

    it('returns view with crumb', async () => {

        const server = Hapi.server();

        server.route([
            {
                method: 'GET',
                path: '/1',
                handler: (request, h) => {

                    expect(request.plugins.crumb).to.exist();
                    expect(request.server.plugins.crumb.generate).to.exist();

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST',
                path: '/2',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST',
                path: '/3',
                options: {
                    payload: {
                        output: 'stream'
                    }
                },
                handler: (request, h) => 'never'
            },
            {
                method: 'GET',
                path: '/4',
                options: {
                    plugins: {
                        crumb: false
                    }
                },
                handler: (request, h) => {

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST',
                path: '/5',
                options: {
                    payload: {
                        output: 'stream'
                    }
                },
                handler: (request, h) => 'yo'
            },
            {
                method: 'GET',
                path: '/6',
                handler: (request, h) => h.view('index')
            },
            {
                method: 'GET',
                path: '/7',
                handler: (request, h) => h.redirect('/1')
            }
        ]);

        await server.register([
            Vision,
            {
                plugin: Crumb,
                options: {
                    cookieOptions: {
                        isSecure: true
                    }
                }
            }
        ]);

        server.views(internals.viewOptions);

        // Works with get requests
        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        expect(res.statusCode).to.equal(200);

        const header = res.headers['set-cookie'];

        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

        expect(res.result).to.equal(Views.viewWithCrumb(cookie[1]));

        // Works with crumb on POST body request
        const res2 = await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value", "crumb": "' + cookie[1] + '" }',
            headers: {
                cookie: 'crumb=' + cookie[1]
            }
        });

        expect(res2.result).to.equal('valid');

        // Rejects on invalid crumb on POST body request
        const res3 = await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value", "crumb": "x' + cookie[1] + '" }',
            headers: {
                cookie: 'crumb=' + cookie[1]
            }
        });

        expect(res3.statusCode).to.equal(403);

        // Rejects on missing crumb on POST stream body requests
        const res4 = await server.inject({
            method: 'POST',
            url: '/3',
            headers: {
                cookie: 'crumb=' + cookie[1]
            }
        });

        expect(res4.statusCode).to.equal(403);

        // Works with crumb generation disabled
        const res5 = await server.inject({
            method: 'GET',
            url: '/4'
        });

        expect(res5.result).to.equal(Views.viewWithoutCrumb());

        // Works on POST stream requests



        const TestStream = class extends Stream.Readable {

            constructor(options) {

                super(options);
                this._max = 2;
                this._index = 1;
            }

            _read() {

                const i = this._index++;
                if (i > this._max) {
                    this.push(null);
                }
                else {
                    const str = '' + i;
                    const buf = Buffer.from(str, 'ascii');
                    this.push(buf);
                }
            }
        };

        const res6 = await server.inject({
            method: 'POST',
            url: '/5',
            payload: new TestStream(),
            headers: {
                'content-type': 'application/octet-stream',
                'content-disposition': 'attachment; filename="test.txt"'
            },
            simulate: {
                end: true
            }
        });

        expect(res6.statusCode).to.equal(403);

        // Works with get requests with no context
        const res7 = await server.inject({
            method: 'GET',
            url: '/6'
        });

        const header2 = res7.headers['set-cookie'];
        expect(header2.length).to.equal(1);
        expect(header2[0]).to.contain('Secure');

        const cookie2 = header2[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
        expect(res7.result).to.equal(Views.viewWithCrumbAndNoContext(cookie2[1]));

        // Works with redirections
        const res8 = await server.inject({
            method: 'GET',
            url: '/7'
        });

        const cookie3 = res8.headers['set-cookie'].toString();
        expect(cookie3).to.contain('crumb');

        const headers = {};
        headers.origin = 'http://127.0.0.1';

        // Works with cross-origin enabled requests
        const res9 = await server.inject({
            method: 'GET',
            url: '/1',
            headers
        });

        const cookie4 = res9.headers['set-cookie'].toString();
        expect(cookie4).to.contain('crumb');
    });

    it('Does not add crumb to view context when "addToViewContext" option set to false', async () => {

        const server = Hapi.server();

        server.route({
            method: 'GET',
            path: '/1',
            handler: (request, h) => {

                expect(request.plugins.crumb).to.exist();
                expect(request.server.plugins.crumb.generate).to.exist();

                return h.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        const plugins = [
            Vision,
            {
                plugin: Crumb,
                options: {
                    cookieOptions: {
                        isSecure: true
                    },
                    addToViewContext: false
                }
            }
        ];

        await server.register(plugins);
        server.views(internals.viewOptions);

        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        expect(res.result).to.equal(Views.viewWithoutCrumb());
    });

    it('Works without specifying plugin options', async () => {

        const server = Hapi.server();

        server.route({
            method: 'GET',
            path: '/1',
            handler: (request, h) => {

                expect(request.plugins.crumb).to.exist();
                expect(request.server.plugins.crumb.generate).to.exist();

                return h.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        await server.register([Vision, Crumb]);

        server.views(internals.viewOptions);

        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);
        expect(res.result).to.equal(Views.viewWithCrumb(cookie[1]));
    });

    it('Adds to the request log if plugin option logUnauthorized is set to true', async () => {

        const server = Hapi.server();

        let logFound;
        const preResponse = function (request, h) {

            const logs = request.logs;
            logFound = logs.find((log) => {

                return log.tags[0] === 'crumb' && log.data === 'validation failed';
            });

            return h.continue;
        };

        server.ext('onPreResponse', preResponse);

        server.route({
            method: 'POST',
            path: '/1',
            config: {
                log: {
                    collect: true
                }
            },
            handler: (request, h) => 'test'
        });

        await server.register([
            {
                plugin: Crumb,
                options: {
                    logUnauthorized: true
                }
            }
        ]);

        const headers = {};
        headers['X-API-Token'] = 'test';

        await server.inject({
            method: 'POST',
            url: '/1',
            payload: '{ "key": true }',
            headers
        });
        expect(logFound).to.exist();
    });

    it('Does not add to the request log if plugin option logUnauthorized is set to false', async () => {

        const server = Hapi.server();

        let logFound;
        const preResponse = function (request, h) {

            const logs = request.logs;
            logFound = logs.find((log) => {

                return log.tags[0] === 'crumb' && log.data === 'validation failed';
            });

            return h.continue;
        };

        server.ext('onPreResponse', preResponse);

        server.route({
            method: 'POST',
            path: '/1',
            config: {
                log: {
                    collect: true
                }
            },
            handler: (request, h) => 'test'
        });

        await server.register([
            {
                plugin: Crumb,
                options: {
                    logUnauthorized: false
                }
            }
        ]);

        const headers = {};
        headers['X-API-Token'] = 'test';

        await server.inject({
            method: 'POST',
            url: '/1',
            headers
        });

        expect(logFound).to.not.exist();
    });

    it('should fail to register with bad options', async () => {

        const server = Hapi.server();

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

        const server = Hapi.server();

        server.route([
            {
                method: 'GET',
                path: '/1',
                handler: (request, h) => {

                    const crumb = request.plugins.crumb;

                    expect(crumb).to.not.exist();

                    return 'bonjour';
                }
            },
            {
                method: 'GET',
                path: '/2',
                options: {
                    plugins: {
                        crumb: true
                    }
                },
                handler: (request, h) => 'hola'
            }
        ]);

        await server.register([
            Vision,
            {
                plugin: Crumb,
                options: {
                    autoGenerate: false
                }
            }
        ]);

        server.views(internals.viewOptions);

        await server.inject({
            method: 'GET',
            url: '/1'
        });

        const res = await server.inject({ method: 'GET', url: '/2' });

        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
    });

    it('route should still validate crumb when autoGenerate is false and route.options.plugins.crumb is not defined', async () => {

        const server = Hapi.server();

        server.route([
            {
                method: 'POST',
                path: '/1',
                handler: (request, h) => {

                    return 'bonjour';
                }
            }
        ]);

        await server.register([
            Vision,
            {
                plugin: Crumb,
                options: {
                    autoGenerate: false,
                    restful: true
                }
            }
        ]);

        server.views(internals.viewOptions);

        let res = await server.inject({ method: 'POST', url: '/1' });
        expect(res.statusCode).to.equal(403);

        const crumbValue = 'someCrumbValue';
        res = await server.inject({
            method: 'POST',
            url: '/1',
            headers: {
                cookie: `crumb=${crumbValue}`,
                'X-CSRF-token': crumbValue
            }
        });
        expect(res.statusCode).to.equal(200);
    });

    it('fails validation when no payload provided and not using restful mode', async () => {

        const server = Hapi.server();

        server.route({
            method: 'POST',
            path: '/1',
            handler: (request, h) => 'test'
        });

        await server.register([Crumb]);

        const headers = {};
        headers['X-API-Token'] = 'test';

        const res = await server.inject({
            method: 'POST',
            url: '/1',
            headers
        });

        expect(res.statusCode).to.equal(403);
    });

    it('does not validate crumb when "skip" option returns true', async () => {

        const server = Hapi.server();

        server.route({
            method: 'POST',
            path: '/1',
            handler: (request, h) => 'test'
        });

        const skip = (request) => request.headers['x-api-token'] === 'test';

        const plugins = [
            {
                plugin: Crumb,
                options: {
                    skip
                }
            }
        ];

        await server.register(plugins);

        const headers = {
            'X-API-Token': 'test'
        };

        const res = await server.inject({
            method: 'POST',
            url: '/1',
            headers
        });

        const header = res.headers['set-cookie'];

        expect(res.statusCode).to.equal(200);
        expect(header).to.not.exist();
    });

    it('validates crumb when "skip" option returns false', async () => {

        const server = Hapi.server();

        server.route({
            method: 'POST',
            path: '/1',
            handler: (request, h) => 'test'
        });

        const skip = (request) => false;

        const plugins = [
            {
                plugin: Crumb,
                options: {
                    skip
                }
            }
        ];

        await server.register(plugins);

        const headers = {
            'X-API-Token': 'test'
        };

        const res = await server.inject({
            method: 'POST',
            url: '/1',
            headers
        });

        expect(res.statusCode).to.equal(403);
    });

    it('ensures crumb "skip" option is a function', async () => {

        const server = Hapi.server();

        server.route({
            method: 'POST',
            path: '/1',
            handler: (request, h) => 'test'
        });

        const skip = true;

        try {
            await server.register([
                Vision,
                {
                    plugin: Crumb,
                    options: { skip }
                }
            ]);
        }
        catch (err) {
            expect(err).to.exist();
        }
    });

    it('does not set crumb cookie insecurely', async () => {

        const server = Hapi.server({
            host: 'localhost',
            port: 80,
            routes: {
                cors: true
            }
        });

        server.route({
            method: 'GET',
            path: '/1',
            options: {
                cors: false
            },
            handler: (request, h) => 'test'
        });

        server.route({
            method: 'GET',
            path: '/2',
            handler: (request, h) => 'test'
        });

        server.route({
            method: 'GET',
            path: '/3',
            options: {
                cors: {
                    origin: ['http://127.0.0.1']
                }
            },
            handler: (request, h) => 'test'
        });

        await server.register(Crumb);

        const headers = {};

        const res = await server.inject({
            method: 'GET',
            url: '/1',
            headers
        });

        const header = res.headers['set-cookie'];
        expect(header[0]).to.contain('crumb');

        headers.origin = 'http://localhost';

        const res2 = await server.inject({
            method: 'GET',
            url: '/2',
            headers
        });

        const header2 = res2.headers['set-cookie'];
        expect(header2[0]).to.contain('crumb');

        headers.origin = 'http://127.0.0.1';

        const res3 = await server.inject({
            method: 'GET',
            url: '/3',
            headers
        });

        const header3 = res3.headers['set-cookie'];

        expect(header3[0]).to.contain('crumb');

        const res4 = await server.inject({
            method: 'GET',
            url: '/3'
        });

        const header4 = res4.headers['set-cookie'];

        expect(header4[0]).to.contain('crumb');

        headers.origin = 'http://badsite.com';

        const res5 = await server.inject({
            method: 'GET',
            url: '/3',
            headers
        });

        const header5 = res5.headers['set-cookie'];
        expect(header5).to.not.exist();
    });

    it('does not set crumb cookie insecurely using https', async () => {

        const options = {
            host: 'localhost',
            port: 443,
            tls: TLSCert
        };

        const server = Hapi.server(options);

        server.route([
            {
                method: 'GET',
                path: '/1',
                handler: (request, h) => 'test'
            }
        ]);

        await server.register(Crumb);

        const res = await server.inject({
            method: 'GET',
            url: '/1',
            headers: {
                host: 'localhost:443'
            }
        });

        const header = res.headers['set-cookie'];
        expect(header[0]).to.contain('crumb');
    });

    it('validates crumb with X-CSRF-Token header', async () => {

        const server = Hapi.server();

        server.route([
            {
                method: 'GET',
                path: '/1',
                handler: (request, h) => {

                    expect(request.plugins.crumb).to.exist();
                    expect(request.server.plugins.crumb.generate).to.exist();

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST',
                path: '/2',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST',
                path: '/3',
                options: { payload: { output: 'stream' } },
                handler: (request, h) => 'never'
            },
            {
                method: 'PUT',
                path: '/4',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'PATCH',
                path: '/5',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'DELETE',
                path: '/6',
                handler: (request, h) => 'valid'
            },
            {
                method: 'POST',
                path: '/7',
                options: {
                    plugins: {
                        crumb: false
                    }
                },
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST',
                path: '/8',
                options: {
                    plugins: {
                        crumb: {
                            restful: false,
                            source: 'payload'
                        }
                    }
                },
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            }

        ]);

        await server.register([
            Vision,
            {
                plugin: Crumb,
                options: {
                    restful: true,
                    cookieOptions: {
                        isSecure: true
                    }
                }
            }
        ]);

        server.views(internals.viewOptions);

        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

        const validHeader = {
            cookie: 'crumb=' + cookie[1],
            'x-csrf-token': cookie[1]
        };

        const invalidHeader = {
            cookie: 'crumb=' + cookie[1],
            'x-csrf-token': 'x' + cookie[1]
        };

        expect(res.result).to.equal(Views.viewWithCrumb(cookie[1]));

        const res2 = await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value" }',
            headers: validHeader
        });

        expect(res2.result).to.equal('valid');

        const res3 = await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value" }',
            headers: invalidHeader
        });

        expect(res3.statusCode).to.equal(403);

        const res4 = await server.inject({
            method: 'POST',
            url: '/3',
            headers: {
                cookie: 'crumb=' + cookie[1]
            }
        });

        expect(res4.statusCode).to.equal(403);

        const res5 = await server.inject({
            method: 'PUT',
            url: '/4',
            payload: '{ "key": "value" }',
            headers: validHeader
        });

        expect(res5.result).to.equal('valid');

        const res6 = await server.inject({
            method: 'PUT',
            url: '/4',
            payload: '{ "key": "value" }',
            headers: invalidHeader
        });

        expect(res6.statusCode).to.equal(403);

        const res7 = await server.inject({
            method: 'PATCH',
            url: '/5',
            payload: '{ "key": "value" }',
            headers: validHeader
        });

        expect(res7.result).to.equal('valid');

        const res8 = await server.inject({
            method: 'PATCH',
            url: '/5',
            payload: '{ "key": "value" }',
            headers: invalidHeader
        });

        expect(res8.statusCode).to.equal(403);

        const res9 = await server.inject({
            method: 'DELETE',
            url: '/6',
            headers: validHeader
        });

        expect(res9.result).to.equal('valid');

        const res10 = await server.inject({
            method: 'DELETE',
            url: '/6',
            headers: invalidHeader
        });

        expect(res10.statusCode).to.equal(403);

        const res11 = await server.inject({
            method: 'POST',
            url: '/7',
            payload: '{ "key": "value" }'
        });

        expect(res11.result).to.equal('valid');

        const payload = { key: 'value', crumb: cookie[1] };

        delete validHeader['x-csrf-token'];

        const res12 = await server.inject({
            method: 'POST',
            url: '/8',
            payload: JSON.stringify(payload),
            headers: validHeader
        });

        expect(res12.statusCode).to.equal(200);
    });

    it('validates crumb with a custom header name', async () => {

        const server = Hapi.server();

        server.route([
            {
                method: 'GET',
                path: '/1',
                handler: (request, h) => {

                    expect(request.plugins.crumb).to.exist();
                    expect(request.server.plugins.crumb.generate).to.exist();

                    return h.view('index', {
                        title: 'test',
                        message: 'hi'
                    });
                }
            },
            {
                method: 'POST',
                path: '/2',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST',
                path: '/3',
                options: { payload: { output: 'stream' } },
                handler: (request, h) => 'never'
            },
            {
                method: 'PUT',
                path: '/4',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'PATCH',
                path: '/5',
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'DELETE',
                path: '/6',
                handler: (request, h) => 'valid'
            },
            {
                method: 'POST',
                path: '/7',
                options: {
                    plugins: {
                        crumb: false
                    }
                },
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            },
            {
                method: 'POST',
                path: '/8',
                options: {
                    plugins: {
                        crumb: {
                            restful: false,
                            source: 'payload'
                        }
                    }
                },
                handler: (request, h) => {

                    expect(request.payload).to.equal({ key: 'value' });
                    return 'valid';
                }
            }

        ]);

        await server.register([
            Vision,
            {
                plugin: Crumb,
                options: {
                    restful: true,
                    cookieOptions: {
                        isSecure: true
                    },
                    headerName: 'X-CUSTOM-TOKEN'
                }
            }
        ]);

        server.views(internals.viewOptions);

        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

        const validHeader = {
            cookie: 'crumb=' + cookie[1],
            'x-custom-token': cookie[1]
        };

        const invalidHeader = {
            cookie: 'crumb=' + cookie[1],
            'x-custom-token': 'x' + cookie[1]
        };

        expect(res.result).to.equal(Views.viewWithCrumb(cookie[1]));

        const res2 = await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value" }',
            headers: validHeader
        });

        expect(res2.result).to.equal('valid');

        const res3 = await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value" }',
            headers: invalidHeader
        });

        expect(res3.statusCode).to.equal(403);

        const res4 = await server.inject({
            method: 'POST',
            url: '/3',
            headers: {
                cookie: 'crumb=' + cookie[1]
            }
        });

        expect(res4.statusCode).to.equal(403);

        const res5 = await server.inject({
            method: 'PUT',
            url: '/4',
            payload: '{ "key": "value" }',
            headers: validHeader
        });

        expect(res5.result).to.equal('valid');

        const res6 = await server.inject({
            method: 'PUT',
            url: '/4',
            payload: '{ "key": "value" }',
            headers: invalidHeader
        });

        expect(res6.statusCode).to.equal(403);

        const res7 = await server.inject({
            method: 'PATCH',
            url: '/5',
            payload: '{ "key": "value" }',
            headers: validHeader
        });

        expect(res7.result).to.equal('valid');

        const res8 = await server.inject({
            method: 'PATCH',
            url: '/5',
            payload: '{ "key": "value" }',
            headers: invalidHeader
        });

        expect(res8.statusCode).to.equal(403);

        const res9 = await server.inject({
            method: 'DELETE',
            url: '/6',
            headers: validHeader
        });

        expect(res9.result).to.equal('valid');

        const res10 = await server.inject({
            method: 'DELETE',
            url: '/6',
            headers: invalidHeader
        });

        expect(res10.statusCode).to.equal(403);

        const res11 = await server.inject({
            method: 'POST',
            url: '/7',
            payload: '{ "key": "value" }'
        });

        expect(res11.result).to.equal('valid');

        const payload = { key: 'value', crumb: cookie[1] };

        delete validHeader['x-custom-token'];

        const res12 = await server.inject({
            method: 'POST',
            url: '/8',
            payload: JSON.stringify(payload),
            headers: validHeader
        });

        expect(res12.statusCode).to.equal(200);
    });

    it('Adds to the request log if there are multiple cookie values', async () => {

        const server = Hapi.server();
        let logFound;

        const preResponse = function (request, h) {

            const logs = request.logs;
            logFound = logs.find((log) => {

                return log.tags[0] === 'crumb' && log.data === 'multiple cookies found';
            });

            return h.continue;
        };

        server.ext('onPreResponse', preResponse);

        server.route({
            method: 'GET',
            path: '/1',
            handler: (request, h) => {

                return h.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        server.route({
            method: 'POST',
            path: '/2',
            config: {
                log: {
                    collect: true
                }
            },
            handler: (request, h) => {

                return 'success';
            }
        });

        await server.register([{
            plugin: Vision
        }, {
            plugin: Crumb
        }]);

        server.views(internals.viewOptions);

        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        const header = res.headers['set-cookie'];

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

        const headers = {
            cookie: 'crumb=' + cookie[1] + '; crumb=' + cookie[1] // multiple cookies
        };

        await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "key": "value", "crumb": "' + cookie[1] + '" }',
            headers
        });
        expect(logFound).to.exist();
    });

    it('Adds to the request log if there are multiple cookie values in restful mode', async () => {

        const server = Hapi.server();
        let logFound;

        const preResponse = function (request, h) {

            const logs = request.logs;
            logFound = logs.find((log) => {

                return log.tags[0] === 'crumb' && log.data === 'multiple cookies found';
            });

            return h.continue;
        };

        server.ext('onPreResponse', preResponse);

        server.route({
            method: 'GET',
            path: '/1',
            handler: (request, h) => {

                return h.view('index', {
                    title: 'test',
                    message: 'hi'
                });
            }
        });

        server.route({
            method: 'POST',
            path: '/2',
            config: {
                log: {
                    collect: true
                }
            },
            handler: (request, h) => {

                return 'success';
            }
        });

        await server.register([{
            plugin: Vision
        }, {
            plugin: Crumb,
            options: {
                restful: true
            }
        }]);

        server.views(internals.viewOptions);

        const res = await server.inject({
            method: 'GET',
            url: '/1'
        });

        const header = res.headers['set-cookie'];

        const cookie = header[0].match(/crumb=([^\x00-\x20\"\,\;\\\x7F]*)/);

        const headers = {
            cookie: 'crumb=' + cookie[1] + '; crumb=' + cookie[1], // multiple cookies
            'X-CSRF-Token': cookie[1]
        };

        await server.inject({
            method: 'POST',
            url: '/2',
            payload: '{ "stuff": true }',
            headers
        });
        expect(logFound).to.exist();
    });

    it('should set cookie but ignore check with enforce flag turned off', async () => {

        const server = Hapi.server();

        server.route({
            method: 'POST',
            path: '/1',
            handler: (request, h) => 'test'
        });

        const plugins = [
            {
                plugin: Crumb,
                options: {
                    enforce: false
                }
            }
        ];

        await server.register(plugins);

        const headers = {
            'X-API-Token': 'test'
        };

        const res = await server.inject({
            method: 'POST',
            url: '/1',
            headers
        });

        const header = res.headers['set-cookie'];

        expect(header).to.exist();
        expect(res.statusCode).to.equal(200);
    });
});
