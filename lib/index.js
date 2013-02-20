// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var Cryptiles = require('cryptiles');


// Declare internals

var internals = {};

internals.defaults = {
    name: 'crumb',
    size: 43,                       // Equal to 256 bits
    autoGenerate: true,             // If false, must call request.plugins.crumb.generate() manually before usage
    addToViewContext: true,         // If response is a view, add crumb to context
    cookieOptions: {                // Cookie options (i.e. hapi server.state)
        path: '/'
    }
};


internals.routeDefaults = {
    key: 'crumb',                   // query or payload key
    source: 'payload'               // Crunm key source: 'payload', 'query'
};


exports.register = function (pack, options, next) {

    var settings = Hoek.applyToDefaults(internals.defaults, options || {});

    pack.state(settings.name, settings.cookieOptions);

    pack.ext('onPreHandler', function (request, next) {

        // Validate incoming crumb

        if (!request.route.plugins._crumb) {
            request.route.plugins._crumb = Hoek.applyToDefaults(internals.routeDefaults, request.route.plugins.crumb);
        }

        // Set crumb cookie and calculate crumb

        if (settings.autoGenerate ||
            request.route.plugins._crumb) {

            generate(request);
        }

        // Validate crumb

        if (request.route.plugins._crumb) {
            var crumb = request[request.route.plugins._crumb.source][request.route.plugins._crumb.key];
            if (crumb !== request.plugins.crumb) {
                return next(Boom.forbidden());
            }

            // Remove crumb

            delete request[request.route.plugins._crumb.source][request.route.plugins._crumb.key];
        }

        return next();
    });

    pack.ext('onPostHandler', function (request, next) {

        // Add to view context

        if (settings.addToViewContext &&
            request.plugins.crumb &&
            request.response &&
            !request.response.isBoom &&
            request.response.varieties.view) {

            request.response.view.context = request.response.view.context || {};
            request.response.view.context.crumb = request.plugins.crumb;
        }

        return next();
    });

    var generate = function (request) {

        var crumb = request.state[settings.name];
        if (!crumb) {
            crumb = Cryptiles.randomString(settings.size);
            request.setState(settings.name, crumb, settings.cookieOptions);
        }

        request.plugins.crumb = crumb;
        return request.plugins.crumb;
    };

    pack.api({ generate: generate });

    return next();
};




