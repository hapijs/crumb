'use strict';

// Load modules

const Stream = require('stream');
const Boom = require('boom');
const Cryptiles = require('cryptiles');
const Hoek = require('hoek');
const Joi = require('joi');


// Declare internals

const internals = {};


internals.schema = Joi.object().keys({
    key: Joi.string().optional(),
    size: Joi.number().optional(),
    autoGenerate: Joi.boolean().optional(),
    addToViewContext: Joi.boolean().optional(),
    cookieOptions: Joi.object().keys(null),
    restful: Joi.boolean().optional(),
    skip: Joi.func().optional()
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
    skip: false                    // Set to a function which returns true when to skip crumb generation and validation
};


exports.register = function (server, options, next) {

    const validateOptions = internals.schema.validate(options);
    if (validateOptions.error) {
        return next(validateOptions.error);
    }

    const settings = Hoek.applyToDefaults(internals.defaults, options);

    const routeDefaults = {
        key: settings.key,
        restful: settings.restful,
        source: 'payload'
    };

    server.state(settings.key, settings.cookieOptions);

    server.ext('onPostAuth', (request, reply) => {

        // If skip function enabled. Call it and if returns true, do not attempt to do anything with crumb.

        if (settings.skip && settings.skip(request, reply)) {
            return reply.continue();
        }

        // Validate incoming crumb

        if (typeof request.route.settings.plugins._crumb === 'undefined') {
            if (request.route.settings.plugins.crumb ||
                !request.route.settings.plugins.hasOwnProperty('crumb') && settings.autoGenerate) {

                request.route.settings.plugins._crumb = Hoek.applyToDefaults(routeDefaults, request.route.settings.plugins.crumb || {});
            }
            else {
                request.route.settings.plugins._crumb = false;
            }
        }

        // Set crumb cookie and calculate crumb

        if ((settings.autoGenerate ||
            request.route.settings.plugins._crumb) &&
            (request.route.settings.cors ? checkCORS(request) : true)) {

            generate(request, reply);
        }

        // Validate crumb

        let routeIsRestful;
        if (request.route.settings.plugins._crumb && request.route.settings.plugins._crumb.restful !== undefined) {
            routeIsRestful = request.route.settings.plugins._crumb.restful;
        }
        if (routeIsRestful === false || !routeIsRestful && settings.restful === false) {

            if (request.method !== 'post' ||
                !request.route.settings.plugins._crumb) {

                return reply.continue();
            }

            const content = request[request.route.settings.plugins._crumb.source];
            if (!content || content instanceof Stream) {

                return reply(Boom.forbidden());
            }

            if (content[request.route.settings.plugins._crumb.key] !== request.plugins.crumb) {
                return reply(Boom.forbidden());
            }

            // Remove crumb

            delete request[request.route.settings.plugins._crumb.source][request.route.settings.plugins._crumb.key];
        }
        else {
            if (request.method !== 'post' && request.method !== 'put' && request.method !== 'patch' && request.method !== 'delete' ||
                !request.route.settings.plugins._crumb) {

                return reply.continue();
            }

            const header = request.headers['x-csrf-token'];

            if (!header) {
                return reply(Boom.forbidden());
            }

            if (header !== request.plugins.crumb) {
                return reply(Boom.forbidden());
            }

        }

        return reply.continue();
    });

    server.ext('onPreResponse', (request, reply) => {

        // Add to view context

        const response = request.response;

        if (settings.addToViewContext &&
            request.plugins.crumb &&
            request.route.settings.plugins._crumb &&
            !response.isBoom &&
            response.variety === 'view') {

            response.source.context = response.source.context || {};
            response.source.context[request.route.settings.plugins._crumb.key] = request.plugins.crumb;
        }

        return reply.continue();
    });

    const checkCORS = function (request) {

        if (request.headers.origin) {
            return request.info.cors.isOriginMatch;
        }
        return true;
    };

    const generate = function (request, reply) {

        let crumb = request.state[settings.key];
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
