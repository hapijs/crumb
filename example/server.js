'use strict';

const Hapi = require('hapi');
const Vision = require('vision');

const server = new Hapi.Server({
    host: '127.0.0.1',
    port: 8000
});

const plugins = [
    Vision,
    {
        plugin: require('../'),
        options: {
            cookieOptions: {
                isSecure: false
            }
        }
    }
];

(async () => {

    await server.register(plugins);

    server.views({
        relativeTo: __dirname,
        path: 'templates',
        engines: {
            html: require('handlebars')
        }
    });

    server.route({
        method: 'get',
        path: '/',
        handler: function (request, h) {

            return h.view('index', { title: 'test', message: 'hi' });
        }
    });

    server.route({
        method: 'post',
        path: '/',
        handler: function (request, h) {

            return h.view('message', { title: 'test', message: request.payload.message });
        }
    });

    await server.start();

    console.log('Example server running at:', server.info.uri);
})();
