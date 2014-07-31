var Hapi = require('hapi');

var server = Hapi.createServer('127.0.0.1', 8000);

// Add Crumb plugin

server.pack.register({ plugin: require('../'), options: { restful: true } }, function(err) {
    if (err) throw err;
});

server.route([

    // a "crumb" cookie gets set with any request when not using views

    {
        method: 'GET',
        path: '/generate',
        handler: function(request) {
            // return crumb if desired
            request.reply('{ "crumb": ' + request.plugins.crumb + ' }');
        }
    },

    // request header "X-CSRF-Token" with crumb value must be set in request for this route

    {
        method: 'PUT',
        path: '/crumbed',
        handler: function(request) {
            request.reply('Crumb route');
        }
    },

]);

server.start(function() {
    console.log('Example restful server running at:', server.info.uri);
});