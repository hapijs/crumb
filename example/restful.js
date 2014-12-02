var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ host: '127.0.0.1', port: 8000 });

// Add Crumb plugin

server.register({ register: require('../'), options: { restful: true } }, function (err) {

    if (err) {
        throw err;
    }
});

server.route([

    // a "crumb" cookie gets set with any request when not using views

    {
        method: 'GET',
        path: '/generate',
        handler: function (request, reply) {

            // return crumb if desired
            return reply('{ "crumb": ' + request.plugins.crumb + ' }');
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

server.start(function () {

    console.log('Example restful server running at:', server.info.uri);
});
