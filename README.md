![crumb Logo](https://raw.github.com/hapijs/crumb/master/images/crumb.png)

CSRF crumb generation and validation for [**hapi**](https://github.com/hapijs/hapi)

[![Build Status](https://secure.travis-ci.org/hapijs/crumb.png)](http://travis-ci.org/hapijs/crumb)

Lead Maintainer: [Marcus Stong](https://github.com/stongo)

## CORS

Crumb has been refactored to securely work with CORS, as [OWASP](https://www.owasp.org/index.php/HTML5_Security_Cheat_Sheet#Cross_Origin_Resource_Sharing) recommends using CSRF protection with CORS.

The `allowOrigins` option allows you to have fine grained control on which Cross Origin sites get the Crumb cookie set. This is useful for APIs that have some consumers only using GET routes (no Crumb token should be set) while other consumers have permission for POST/PUT/PATCH/DELETE routes.

If the `allowOrigins` setting is not set, the server's `cors.origin` list will be used to determine when to set the Crumb cookie on Cross Origin requests.

To use Crumb securely on a server that allows Same Origin requests and CORS, it's a requirement to set server `host` to a hostname rather than an IP for Crumb to determine same origin requests. If you use an IP as the server host, your Same Origin requests will not get the Crumb cookie set.

**Note that Crumb will not work with `allowOrigins` or `cors.origin` set to "\*"**

## Plugin Options

The following options are available when registering the plugin

* 'key' - the name of the cookie to store the csrf crumb in (defaults to 'crumb')
* 'size' - the length of the crumb to generate (defaults to 43, which is 256 bits, see [cryptile](https://github.com/hueniverse/cryptiles) for more information)
* 'autoGenerate' - whether to automatically generate a new crumb for requests (defaults to true)
* 'addToViewContext' - whether to automatically add the crumb to view contexts as the given key (defaults to true)
* 'cookieOptions' - storage options for the cookie containing the crumb, see the [server.state](http://hapijs.com/api#serverstatename-options) documentation of hapi for more information
* 'restful' - RESTful mode that validates crumb tokens from "X-CSRF-Token" request header for POST, PUT, PATCH and DELETE server routes. Disables payload/query crumb validation (defaults to false)
* 'skip' - a function with the signature of `function (request, reply) {}`, which when provided, is called for every request. If the provided function returns true, validation and generation of crumb is skipped (defaults to false)
* 'allowOrigins' - an array of origins to set crumb cookie on if CORS is enabled. Supports '\*' wildcards for domain segments and port ie '\*.domain.com' or 'domain.com:\*'. '\*' by itself is not allowed. Defaults to the server's `cors.origin` setting by default

Additionally, some configuration can be passed on a per-route basis

* 'key' - the key used in the view contexts and payloads for the crumb (defaults to whatever the key value in the main settings is)
* 'source' - can be either 'payload' or 'query' specifying how the crumb will be sent in requests (defaults to payload)
* 'restful' - an override for the server's 'restful' setting (defaults to match server setting)
