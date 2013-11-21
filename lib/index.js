// Load modules

var Cryptiles = require('cryptiles');


// Declare internals

var internals = {};

internals.defaults = {
    key: 'crumb',
    size: 43,                       // Equal to 256 bits
    autoGenerate: true,             // If false, must call request.plugins.crumb.generate() manually before usage
    addToViewContext: true,         // If response is a view, add crumb to context
    cookieOptions: {                // Cookie options (i.e. hapi server.state)
        path: '/'
    },
    restful: false                  // Set to true for X-CSRF-Token header crumb validation. Disables payload/query validation
};

// Not used in restful mode
internals.routeDefaults = {
    key: 'crumb',                   // query or payload key
    source: 'payload'               // Crumb key source: 'payload', 'query'
};


exports.register = function (plugin, options, next) {

    var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options || {});
    // copy the key from internals.defaults to internals.routeDefaults for consistency
    internals.routeDefaults.key = settings.key;

    plugin.state(settings.key, settings.cookieOptions);

    plugin.ext('onPostAuth', function (request, next) {

        // Validate incoming crumb

        if (typeof request.route.plugins._crumb === 'undefined') {
            if (request.route.plugins.crumb ||
                !request.route.plugins.hasOwnProperty('crumb')) {

                request.route.plugins._crumb = plugin.hapi.utils.applyToDefaults(internals.routeDefaults, request.route.plugins.crumb || {});
            }
            else {
                request.route.plugins._crumb = false;
            }
        }

        // Set crumb cookie and calculate crumb

        if (settings.autoGenerate ||
            request.route.plugins._crumb) {

            generate(request);
        }

        // Validate crumb

        if (settings.restful === false) {

            if (request.method !== 'post' ||
                !request.route.plugins._crumb) {

                return next();
            }

            var content = request[request.route.plugins._crumb.source];
            if (!content) {
                return next(plugin.hapi.error.forbidden());
            }

            if (content[request.route.plugins._crumb.key] !== request.plugins.crumb) {
                return next(plugin.hapi.error.forbidden());
            }

            // Remove crumb

            delete request[request.route.plugins._crumb.source][request.route.plugins._crumb.key];
        }

        else {

            if (request.method !== 'post' && request.method !== 'put' && request.method !== 'patch' && request.method !== 'delete' ||
                !request.route.plugins._crumb) {

                return next();
            }

            var header = request.headers['x-csrf-token'];

            if (!header)  {

                return next(plugin.hapi.error.forbidden());
            }

            if (header !== request.plugins.crumb) {

                return next(plugin.hapi.error.forbidden());
            }

        }

        return next();
    });

    plugin.ext('onPreResponse', function (request, next) {

        // Add to view context

        var response = request.response();

        if (settings.addToViewContext &&
            request.plugins.crumb &&
            request.route.plugins._crumb &&
            !response.isBoom &&
            response.varieties.view) {

            response.view.context = response.view.context || {};
            response.view.context[request.route.plugins._crumb.key] = request.plugins.crumb;
        }

        return next();
    });

    var generate = function (request) {

        var crumb = request.state[settings.key];
        if (!crumb) {
            crumb = Cryptiles.randomString(settings.size);
            request.setState(settings.key, crumb, settings.cookieOptions);
        }

        request.plugins.crumb = crumb;
        return request.plugins.crumb;
    };

    plugin.api({ generate: generate });

    return next();
};




