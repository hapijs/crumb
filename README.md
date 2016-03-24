![crumb Logo](https://raw.github.com/hapijs/crumb/master/images/crumb.png)

CSRF crumb generation and validation for [**hapi**](https://github.com/hapijs/hapi)

[![Build Status](https://secure.travis-ci.org/hapijs/crumb.png)](http://travis-ci.org/hapijs/crumb)

Lead Maintainer: [Marcus Stong](https://github.com/stongo)

## CORS

Crumb has been refactored to securely work with CORS, as [OWASP](https://www.owasp.org/index.php/HTML5_Security_Cheat_Sheet#Cross_Origin_Resource_Sharing) recommends using CSRF protection with CORS.

**It is highly discouraged to have a production servers `cors.origin` setting set to "[\*]" or "true" with Crumb as it will leak the crumb token to potentially malicious sites**

##What the heck is a crumb though?
A crumb is a unique electronic key which is shared between server and client, and which have a short life time. But how are these useful? Suppose, in my group chat module, upon page load i generate a crumb whose life time is 30 minutes (tunable). Why 30 minutes? Because, I assume my blog viewers to either engage into the group chat module or leave that specific blog post within 30 minutes.

Now whenever a user writes a message, this crumb is passed back to the server side. If user writes a message before 30 minutes, this crumb will be validated and user shout submitted. (30 minutes should take care of 99.99% of the cases). In response, server api sends back the new crumb which should be sent back with the next ajax call.

Now when a spammer try to simulate the ajax request using curl calls, he will not be able to succeed because of the absence of the crumb. But he can capture the crumb from the site and simulate the effect, right? YES he can, but we can take care of this by reducing the life time of the generated crumb.


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


