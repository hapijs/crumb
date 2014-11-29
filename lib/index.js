// Load modules

var Stream = require('stream');
var Boom = require('boom');
var Cryptiles = require('cryptiles');
var Hoek = require('hoek');
var Joi = require('joi');


// Declare internals

var internals = {};


internals.schema = Joi.object().keys({
    key: Joi.string().optional(),
    size: Joi.number().optional(),
    autoGenerate: Joi.boolean().optional(),
    addToViewContext: Joi.boolean().optional(),
    cookieOptions: Joi.object().keys(null),
    restful: Joi.boolean().optional(),
    skip: Joi.any().optional(),
    allowOrigins: Joi.array().excludes(Joi.string().valid('*')).optional()
});


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
    allowOrigins: null              // A list of CORS origins to set crumb cookie on. Defaults to request.route.cors.origin
};


exports.register = function (server, options, next) {

    Joi.assert(options, internals.schema, 'Invalid crumb options');
    var settings = Hoek.applyToDefaults(internals.defaults, options);

    var routeDefaults = {
        key: settings.key,
        restful: settings.resful,
        source: 'payload'
    };

    server.state(settings.key, settings.cookieOptions);

    server.ext('onPostAuth', function (request, reply) {

        // If skip function enabled. Call it and if returns true, do not attempt to do anything with crumb.

        if (settings.skip && typeof settings.skip === 'function' && settings.skip(request, reply)) {
            return reply.continue();
        }

        // Validate incoming crumb

        if (typeof request.route.plugins._crumb === 'undefined') {
            if (request.route.plugins.crumb ||
                !request.route.plugins.hasOwnProperty('crumb') && settings.autoGenerate) {

                request.route.plugins._crumb = Hoek.applyToDefaults(routeDefaults, request.route.plugins.crumb || {});
            }
            else {
                request.route.plugins._crumb = false;
            }
        }

        // Set crumb cookie and calculate crumb

        if ((settings.autoGenerate ||
            request.route.plugins._crumb) &&
            (request.route.cors ? internals.originParser(request.headers.origin, settings.allowOrigins || request.route.cors.origin, request) : true)) {

            generate(request, reply);
        }

        // Validate crumb

        if (settings.restful === false ||
            (!request.route.plugins._crumb || request.route.plugins._crumb.restful === false)) {

            if (request.method !== 'post' ||
                !request.route.plugins._crumb) {

                return reply.continue();
            }

            var content = request[request.route.plugins._crumb.source];
            if (content instanceof Stream) {

                return reply(Boom.forbidden());
            }

            if (content[request.route.plugins._crumb.key] !== request.plugins.crumb) {
                return reply(Boom.forbidden());
            }

            // Remove crumb

            delete request[request.route.plugins._crumb.source][request.route.plugins._crumb.key];
        }
        else {
            if (request.method !== 'post' && request.method !== 'put' && request.method !== 'patch' && request.method !== 'delete' ||
                !request.route.plugins._crumb) {

                return reply.continue();
            }

            var header = request.headers['x-csrf-token'];

            if (!header)  {
                return reply(Boom.forbidden());
            }

            if (header !== request.plugins.crumb) {
                return reply(Boom.forbidden());
            }

        }

        return reply.continue();
    });

    server.ext('onPreResponse', function (request, reply) {

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

        return reply.continue();
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

    server.expose({ generate: generate });

    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};


// Strip http or https from request host

internals.trimHost = function (host) {

    this._host = host;

    if (!this._host) {
        return this._host;
    }
    if (host.indexOf('https://') === 0) {
        this._host = this._host.substring(8);
    }
    if (host.indexOf('http://') === 0) {
        this._host = this._host.substring(7);
    }

    return this._host;
};


// Parses allowOrigin setting

internals.originParser = function (origin, allowOrigins, request) {

    var host = internals.trimHost(request.connection.info.uri);
    var requestHost = internals.trimHost(request.headers.host);
    this._match = false;

    // If a same origin request, pass check

    if (host === requestHost) {
        this._match = true;
        return this._match;
    }

    // If no origin header is set and cross-origin, automatically fail check

    else if (!origin || allowOrigins.length === 0) {
        return this._match;
    }

    // Split origin in to port and domain

    this._origin = origin.split(':');
    this._originPort = this._origin.length === 2 ? this._origin[1] : null;
    this._originParts = this._origin[0].split('.');

    // Iterate through allowed origins list and check origin header matches

    for (var i = 0, il = allowOrigins.length; i < il; ++i) {
        if (allowOrigins[i] === '*') {
            return false;
        }

        this._originAllow = allowOrigins[i].split(':');
        this._originAllowPort = this._originAllow.length === 2 ? this._originAllow[1] : null;
        this._originAllowParts = this._originAllow[0].split('.');

        if ((this._originPort && !this._originAllowPort) || (!this._originPort && this._originAllowPort) || (this._originAllowPort !== '*' && this._originPort !== this._originAllowPort)) {
            this._match = false;
        }
        else {
            for (var j = 0, jl = this._originAllowParts.length; j < jl; ++j) {
                this._match = this._originAllowParts[j] === '*' || this._originAllowParts[j] === this._originParts[j];
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
};
