'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ host: '127.0.0.1', port: 8000 });

// Add Crumb plugin

server.register({ register: require('../'), options: { restful: true } }, (err) => {

    if (err) {
        throw err;
    }
});

server.route([

    // a "crumb" cookie should be set with any request
    // for cross-origin requests, set CORS "credentials" to true
    // a route returning the crumb can be created like this

    {
        method: 'GET',
        path: '/generate',
        handler: function (request, reply) {

            return reply({ crumb: server.plugins.crumb.generate(request, reply) });
        }
    },

    // request header "X-CSRF-Token" with crumb value must be set in request for this route

    {
        method: 'PUT',
        path: '/crumbed',
        handler: function (request, reply) {

            return reply('Crumb route');
        }
    }
]);

server.start(() => {

    console.log('Example restful server running at:', server.info.uri);
});
