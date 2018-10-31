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
            restful: true,
            cookieOptions: {
                isSecure: false
            }
        }
    }
];

// Add Crumb plugin

(async () => {

    await server.register(plugins);

    server.route([

        // a "crumb" cookie should be set with any request
        // for cross-origin requests, set CORS "credentials" to true
        // a route returning the crumb can be created like this

        {
            method: 'GET',
            path: '/generate',
            handler: function (request, h) {

                return {
                    crumb: server.plugins.crumb.generate(request, h)
                };
            }
        },

        // request header "X-CSRF-Token" with crumb value must be set in request for this route

        {
            method: 'PUT',
            path: '/crumbed',
            handler: function (request, h) {

                return 'Crumb route';
            }
        }
    ]);

    await server.start();

    console.log('Example restful server running at:', server.info.uri);
})();
