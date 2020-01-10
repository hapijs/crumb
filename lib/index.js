'use strict';

const Stream = require('stream');

const Boom = require('@hapi/boom');
const Cryptiles = require('@hapi/cryptiles');
const Hoek = require('@hapi/hoek');
const Joi = require('@hapi/joi');


const internals = {
    restfulValidatedMethods: ['post', 'put', 'patch', 'delete']
};


internals.schema = Joi.object().keys({
    key: Joi.string().optional(),
    size: Joi.number().optional(),
    autoGenerate: Joi.boolean().optional(),
    addToViewContext: Joi.boolean().optional(),
    cookieOptions: Joi.object().keys(null),
    headerName: Joi.string().optional(),
    restful: Joi.boolean().optional(),
    skip: Joi.func().optional(),
    enforce: Joi.boolean().optional(),
    logUnauthorized: Joi.boolean().optional()
});


internals.defaults = {
    key: 'crumb',
    size: 43,                       // Equal to 256 bits
    autoGenerate: true,             // If false, must call request.plugins.crumb.generate() manually before usage
    addToViewContext: true,         // If response is a view, add crumb to context
    cookieOptions: {                // Cookie options (i.e. hapi server.state)
        path: '/'
    },
    headerName: 'X-CSRF-Token',     // Specify the name of the custom CSRF header
    restful: false,                 // Set to true for custom header crumb validation. Disables payload/query validation
    skip: false,                    // Set to a function which returns true when to skip crumb generation and validation,
    enforce: true,                  // Set to true for setting the CSRF cookie while not performing validation
    logUnauthorized: false          // Set to true for crumb to write an event to the request log
};


exports.plugin = {
    pkg: require('../package.json'),
    requirements: {
        hapi: '>=19.0.0'
    },

    register: function (server, options) {

        Joi.assert(options, internals.schema);

        const settings = Hoek.applyToDefaults(internals.defaults, options);

        const routeDefaults = {
            key: settings.key,
            restful: settings.restful,
            source: 'payload'
        };

        server.state(settings.key, settings.cookieOptions);

        server.ext('onPostAuth', (request, h) => {

            const unauthorizedLogger = () => {

                if (settings.logUnauthorized) {
                    request.log(['crumb', 'unauthorized'], 'validation failed');
                }
            };

            const getCrumbValue = () => {

                let crumbValue = request.plugins.crumb;

                if (Array.isArray(crumbValue)) {
                    request.log(['crumb'], 'multiple cookies found');
                    crumbValue = request.plugins.crumb[0];
                }

                return crumbValue;
            };

            // If skip function enabled, invoke and if returns true, do not attempt to do anything with crumb

            if (settings.skip &&
                settings.skip(request, h)) {

                return h.continue;
            }

            // Get crumb settings for this route if crumb is enabled on route

            if (request.route.settings.plugins._crumb === undefined) {
                if (request.route.settings.plugins.crumb ||
                    !request.route.settings.plugins.hasOwnProperty('crumb')) {

                    request.route.settings.plugins._crumb = Hoek.applyToDefaults(routeDefaults, request.route.settings.plugins.crumb || {});
                }
                else {
                    request.route.settings.plugins._crumb = false;
                }
            }

            if (!request.route.settings.cors ||
                checkCORS(request)) {

                // Read crumb value from cookie if crumb enabled for this route

                if (request.route.settings.plugins._crumb) {
                    request.plugins.crumb = request.state[settings.key];
                }

                // Generate crumb value if autoGenerate enabled or crumb specifically enabled on route

                if (settings.autoGenerate ||
                    request.route.settings.plugins.crumb) {

                    generate(request, h);
                }
            }

            // Skip validation on dry run

            if (!settings.enforce) {
                return h.continue;
            }

            // Validate crumb

            const restful = request.route.settings.plugins._crumb ? request.route.settings.plugins._crumb.restful : settings.restful;
            if (restful) {
                if (!internals.restfulValidatedMethods.includes(request.method) || !request.route.settings.plugins._crumb) {
                    return h.continue;
                }

                const header = request.headers[settings.headerName.toLowerCase()];

                if (!header) {
                    unauthorizedLogger();
                    throw Boom.forbidden();
                }

                if (header !== getCrumbValue()) {
                    unauthorizedLogger();
                    throw Boom.forbidden();
                }

                return h.continue;
            }

            // Not restful

            if (!request.route.settings.plugins._crumb ||
                request.method !== 'post') {

                return h.continue;
            }

            const content = request[request.route.settings.plugins._crumb.source];
            if (!content ||
                content instanceof Stream) {

                unauthorizedLogger();
                throw Boom.forbidden();
            }

            if (content[request.route.settings.plugins._crumb.key] !== getCrumbValue()) {
                unauthorizedLogger();
                throw Boom.forbidden();
            }

            // Remove crumb

            delete request[request.route.settings.plugins._crumb.source][request.route.settings.plugins._crumb.key];
            return h.continue;
        });

        server.ext('onPreResponse', (request, h) => {

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

            return h.continue;
        });

        const checkCORS = function (request) {

            if (request.headers.origin) {
                return request.info.cors.isOriginMatch;
            }

            return true;
        };

        const generate = function (request, h) {

            if (!request.plugins.crumb) {
                const crumb = Cryptiles.randomString(settings.size);
                h.state(settings.key, crumb, settings.cookieOptions);
                request.plugins.crumb = crumb;
            }

            return request.plugins.crumb;
        };

        server.expose({ generate });
    }
};
