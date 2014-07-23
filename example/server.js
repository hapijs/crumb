var Hapi = require('hapi');

var serverOptions = {
    views: {
        path: __dirname + '/templates',
        engines: {
            html: require('handlebars')
        }
    }
};

var server = new Hapi.Server('127.0.0.1', 8000, serverOptions);

server.pack.register({ plugin: require('../'), options: { cookieOptions: { isSecure: false } } }, function (err) {
    if (err) throw err;
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

server.start(function () {
    console.log('Example server running at:', server.info.uri);
});
