![crumb Logo](https://raw.github.com/hapijs/crumb/master/images/crumb.png)

CSRF crumb generation and validation for [**hapi**](https://github.com/hapijs/hapi)

[![Build Status](https://secure.travis-ci.org/hapijs/crumb.png)](http://travis-ci.org/hapijs/crumb)

Lead Maintainer: [Marcus Stong](https://github.com/stongo)

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

**What the heck is a crumb
Let's say we allow users to post images on our forum. What if one of our users posted this image?

<img src="http://foo.com/logout">
Not really an image, true, but it will force the target URL to be retrieved by any random user who happens to browse that page -- using their browser credentials! From the webserver's perspective, there is no difference whatsoever between a real user initiated browser request and the above image URL retrieval.

If our logout page was a simple HTTP GET that required no confirmation, every user who visited that page would immediately be logged out. That's XSRF in action. Not necessarily dangerous, but annoying. Not too difficult to envision much more destructive versions of this technique, is it?

There are two obvious ways around this sort of basic XSRF attack:

Use a HTTP POST form submission for logout, not a garden variety HTTP GET.
Make the user confirm the logout.
Easy fix, right? We probably should never have never done either of these things in the first place. Duh!

Not so fast. Even with both of the above fixes, you are still vulnerable to XSRF attacks. Let's say I took my own advice, and converted the logout form to a HTTP POST, with a big button titled "Log Me Out" confirming the action. What's to stop a malicious user from placing a form like this on their own website ..
```
<body onload="document.getElementById('f').submit()">
<form id="f" action="http://foo.com/logout" method="post">
<input name="Log Me Out" value="Log Me Out" />
</form>
</body>
```
.. and then convincing other users to click on it?

Remember, the browser will happily act on this request, submitting this form along with all necessary cookies and credentials directly to your website. Blam. Logged out. Exactly as if they had clicked on the "Log Me Out" button themselves.

Sure, it takes a tiny bit more social engineering to convince users to visit some random web page, but it's not much. And the possibilities for attack are enormous: with XSRF, malicious users can initiate any arbitrary action they like on a target website. All they need to do is trick unwary users of your website -- who already have a validated user session cookie stored in their browser -- into clicking on their links.

So what can we d

