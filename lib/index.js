// Load modules

var Hoek = require('hoek');
var Stream = require('stream');
var Cryptiles = require('cryptiles');
var Joi = require('joi');
var schema = require('./schema');


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
    restful: false,                 // Set to true for X-CSRF-Token header crumb validation. Disables payload/query validation
    skip: false,                    // Set to a function which returns true when to skip crumb generation and validation
    allowOrigins: []                // A list of CORS origins to set crumb cookie on
};

// Not used in restful mode

internals.routeDefaults = {
    key: 'crumb',                   // query or payload key
    source: 'payload',              // Crumb key source: 'payload', 'query'
    restful: false
};

// Parses allowOrigin setting

internals.originParser = function(origin, allowOrigins, request) {

    var host = request.server.info.uri;
    var requestHost = request.headers.host;

    if (host === requestHost) {
        return true;
    }
    else if (!origin || allowOrigins.length === 0) {
        return false;
    }

    this._origin = origin.split(':');
    this._originPort = this._origin.length === 2 ? this._origin[1] : null;
    this._originParts = this._origin[0].split('.');
    this._match = false;

    for (var i = 0, allowOriginsLen = allowOrigins.length; i < allowOriginsLen; i++) {
        this._originAllow = allowOrigins[i].split(':');
        this._originAllowPort = this._originAllow.length === 2 ? this._originAllow[1] : null;
        this._originAllowParts = this._originAllow[0].split('.');

        if ((this._originPort && !this._originAllowPort) || (!this._originPort && this._originAllowPort) || (this._originAllowPort !== '*' && this._originPort !== this._originAllowPort)) {
            this._match = false;
        }
        else {
            for (var ii = 0, allowOriginPartsLen = this._originAllowParts.length; ii < allowOriginPartsLen; ii++) {
                this._match = this._originAllowParts[ii] === '*' || this._originAllowParts[ii] === this._originParts[ii];
                if (!this._match) {
                    break;
                }
            }
            if (this._match) {
                return this._match;
            }
        }
    }
    return this._match;
}


exports.register = function (plugin, options, next) {

    Joi.validate(options, schema, { convert: false }, function (err, value) {

        if (err) {
            //plugin.hapi.error.internal('Invalid plugin options for crumb', err);
            return next('Invalid plugin options for crumb: ' + JSON.stringify(err));
        }

        var settings = Hoek.applyToDefaults(internals.defaults, options);
        // copy the key and restful settings from internals.defaults to internals.routeDefaults for consistency
        internals.routeDefaults.key = settings.key;
        internals.routeDefaults.restful = settings.restful;

        plugin.state(settings.key, settings.cookieOptions);

        plugin.ext('onPostAuth', function (request, reply) {

            // If skip function enabled. Call it and if returns true, do not attempt to do anything with crumb.

            if (settings.skip && typeof settings.skip === 'function' && settings.skip(request, reply)) {
                return reply();
            }

            // Validate incoming crumb

            if (typeof request.route.plugins._crumb === 'undefined') {
                if (request.route.plugins.crumb ||
                    !request.route.plugins.hasOwnProperty('crumb') && settings.autoGenerate) {

                    request.route.plugins._crumb = Hoek.applyToDefaults(internals.routeDefaults, request.route.plugins.crumb || {});
                }
                else {
                    request.route.plugins._crumb = false;
                }
            }

            // Set crumb cookie and calculate crumb

            if ((settings.autoGenerate ||
                request.route.plugins._crumb) &&
                (request.server.settings.cors ? internals.originParser(request.headers.origin, settings.allowOrigins, request) : true)) {

                generate(request, reply);
            }

            // Validate crumb

            if (settings.restful === false ||
                (!request.route.plugins._crumb || request.route.plugins._crumb.restful === false)) {

                if (request.method !== 'post' ||
                    !request.route.plugins._crumb) {

                    return reply();
                }

                var content = request[request.route.plugins._crumb.source];
                if (content instanceof Stream) {

                    return reply(plugin.hapi.error.forbidden());
                }

                if (content[request.route.plugins._crumb.key] !== request.plugins.crumb) {
                    return reply(plugin.hapi.error.forbidden());
                }

                // Remove crumb

                delete request[request.route.plugins._crumb.source][request.route.plugins._crumb.key];
            }
            else {
                if (request.method !== 'post' && request.method !== 'put' && request.method !== 'patch' && request.method !== 'delete' ||
                    !request.route.plugins._crumb) {

                    return reply();
                }

                var header = request.headers['x-csrf-token'];

                if (!header)  {
                    return reply(plugin.hapi.error.forbidden());
                }

                if (header !== request.plugins.crumb) {
                    return reply(plugin.hapi.error.forbidden());
                }

            }

            return reply();
        });

        plugin.ext('onPreResponse', function (request, reply) {

            // Add to view context

            var response = request.response;

            if (settings.addToViewContext &&
                request.plugins.crumb &&
                request.route.plugins._crumb &&
                !response.isBoom &&
                response.variety === 'view') {

                response.source.context = response.source.context || {};
                response.source.context[request.route.plugins._crumb.key] = request.plugins.crumb;
            }

            return reply();
        });

        var generate = function (request, reply) {

            var crumb = request.state[settings.key];
            if (!crumb) {
                crumb = Cryptiles.randomString(settings.size);
                reply.state(settings.key, crumb, settings.cookieOptions);
            }

            request.plugins.crumb = crumb;
            return request.plugins.crumb;
        };

        plugin.expose({ generate: generate });

        return next();
    });
};

exports.register.attributes = {
    pkg: require('../package.json')
};
