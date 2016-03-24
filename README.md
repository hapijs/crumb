![crumb Logo](https://raw.github.com/hapijs/crumb/master/images/crumb.png)

CSRF crumb generation and validation for [**hapi**](https://github.com/hapijs/hapi)

[![Build Status](https://secure.travis-ci.org/hapijs/crumb.png)](http://travis-ci.org/hapijs/crumb)

Lead Maintainer: [Marcus Stong](https://github.com/stongo)

## CORS

Crumb has been refactored to securely work with CORS, as [OWASP](https://www.owasp.org/index.php/HTML5_Security_Cheat_Sheet#Cross_Origin_Resource_Sharing) recommends using CSRF protection with CORS.

**It is highly discouraged to have a production servers `cors.origin` setting set to "[\*]" or "true" with Crumb as it will leak the crumb token to potentially malicious sites**

##What the heck is a crumb though?
A crumb analogous to a web cookie is a unique electronic key which is shared between server and client, and which have a short life time. They are generated on web page request with a time limit for when it expires. When a user has to submit information whether it be their personal information or an instant message... crumbs are required upon request, the user sends a crumb will be validation. If it is not the same as the crumb intially set then the submission will fail. 

In response, server api sends back the new crumb which should be sent back with the next ajax call.

When a spammer tries simulate the ajax request calls, he/she will not be able to succeed because of the absence of the crumb. It is possible that the spammer will detect what the crumb is and send back the same crumb which defeats the purpose of having a crumb but, they are work arounds to prevent that as well.




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


