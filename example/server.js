'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ host: '127.0.0.1', port: 8000 });

server.views({
    path: __dirname + '/templates',
    engines: {
        html: require('handlebars')
    }
});

server.register({ register: require('../'), options: { cookieOptions: { isSecure: false } } }, (err) => {

    if (err) {
        throw err;
    }
});

server.route({
    method: 'get',
    path: '/',
    handler: function (request, reply) {

        return reply.view('index', { title: 'test', message: 'hi' });
    }
});

server.route({
    method: 'post',
    path: '/',
    handler: function (request, reply) {

        return reply.view('message', { title: 'test', message: request.payload.message });
    }
});

server.start(() => {

    console.log('Example server running at:', server.info.uri);
});
