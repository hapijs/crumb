![crumb Logo](https://raw.github.com/hapijs/crumb/master/images/crumb.png)

CSRF crumb generation and validation for [**hapi**](https://github.com/hapijs/hapi)

[![Build Status](https://secure.travis-ci.org/hapijs/crumb.png)](http://travis-ci.org/hapijs/crumb)

Lead Maintainer: [Marcus Stong](https://github.com/stongo)

## What to Use Crumb for and When to Use It

Crumb is used to diminish CSRF attacks using a random unique token that is validated on the server side.

Crumb may be used whenever you want to prevent malicious code to execute system commands, that are performed by HTTP requests. For example, if users are able to publish code on your website, malicious code added by a user could force every other user who opens the page, to load and execute code from a third party website e.g. via an HTML image tag. With Crumb implemented into your hapi.js application, you are able to verify requests with unique tokens and prevent the execution of malicious requests. 

## CORS

Crumb has been refactored to securely work with CORS, as [OWASP](https://www.owasp.org/index.php/HTML5_Security_Cheat_Sheet#Cross_Origin_Resource_Sharing) recommends using CSRF protection with CORS.

**It is highly discouraged to have a production servers `cors.origin` setting set to "[\*]" or "true" with Crumb as it will leak the crumb token to potentially malicious sites**



## Plugin Options

The following options are available when registering the plugin

* 'key' - the name of the cookie to store the csrf crumb in (defaults to 'crumb')
* 'size' - the length of the crumb to generate (defaults to 43, which is 256 bits, see [cryptile](https://github.com/hueniverse/cryptiles) for more information)
* 'autoGenerate' - whether to automatically generate a new crumb for requests (defaults to true)
* 'addToViewContext' - whether to automatically add the crumb to view contexts as the given key (defaults to true)
* 'cookieOptions' - storage options for the cookie containing the crumb, see the [server.state](http://hapijs.com/api#serverstatename-options) documentation of hapi for more information
* 'restful' - RESTful mode that validates crumb tokens from "X-CSRF-Token" request header for POST, PUT, PATCH and DELETE server routes. Disables payload/query crumb validation (defaults to false)
* 'skip' - a function with the signature of `function (request, reply) {}`, which when provided, is called for every request. If the provided function returns true, validation and generation of crumb is skipped (defaults to false)

Additionally, some configuration can be passed on a per-route basis

* 'key' - the key used in the view contexts and payloads for the crumb (defaults to whatever the key value in the main settings is)
* 'source' - can be either 'payload' or 'query' specifying how the crumb will be sent in requests (defaults to payload)
* 'restful' - an override for the server's 'restful' setting (defaults to match server setting)
