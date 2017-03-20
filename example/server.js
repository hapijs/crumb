'use strict';

const Hapi = require('hapi');
const Vision = require('vision');

const server = new Hapi.Server();

server.connection({
  host: '127.0.0.1',
  port: 8000
});

const registrations = [
  {
      register: Vision
  },
  {
      register: require('../'),
      options: {
          cookieOptions: {
              isSecure: false
          }
      }
  },
];


server.register(registrations, (err) => {

    if (err) {
        throw err;
    }

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
});
