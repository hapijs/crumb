<a href="https://github.com/spumko"><img src="https://raw.github.com/spumko/spumko/master/images/from.png" align="right" /></a>
![crumb Logo](https://raw.github.com/spumko/crumb/master/images/crumb.png)

CSRF crumb generation for [**hapi**](https://github.com/spumko/hapi)

## Overview
By enabling Crumb, all POST server routes expect a "crumb" value in the request payload or as a query to prevent CSRF/XSRF attacks, unless explictly disabled per route. A GET call to any route is required to set crumb cookie if not using views.

Crumb also provides a RESTful mode that validates crumb tokens from a "X-CSRF-Token" header for POST, PUT, PATCH and DELETE server routes.

## Basic Usage

	var Hapi = require('hapi');
	
	var server = Hapi.createServer('localhost', 3000);
	
	// Default crumb options
	var options = {
  		name: 'crumb',
 		size: 43,               // Equal to 256 bits
    	autoGenerate: true,     // If false, must call request.plugins.crumb.generate() manually before usage
    	addToViewContext: true, // If response is a view, add crumb to context
    	cookieOptions: {        // Cookie options (i.e. hapi server.state)
        	path: '/'
    	},
   		restful: false          // true for X-CSRF-Token header validation. Disables payload/query validation
	}
	
	server.pack.require('crumb', options, function(err) {
   		 if (err) {
   		 	console.error('failed loading Crumb plugin');
   		 }
	});
	
	// Default route plugin config when not in restful mode:
	// {
	//	    key: 'crumb',
	//	    source: 'payload' // Crumb source: 'payload', 'query'
	// };

	// Sample Routes
	
	server.route([
	
		// view context contains crumb
		
		{
			method: 'GET',
			path: '/home',
			handler: function(request) {
				request.view('home', {
					'title': 'test'
					// automatically generated and passed to context
					// 'crumb': 'VALUE'
				});
			}
		},
		
		// a "crumb" cookie gets set with any request when not using views
		
		{ 
			method: 'GET',
			path: '/generate', 
			handler: function(request) {
				request.reply('hello world');
			}
		}, 
		
		// payload must include crumb from cookie or view context
		// {"crumb" : "I2dU244CCj9T3noerkFfVONv2kpQlRK3Uxsw1xfZ48wT"}
		
		{
			method: 'POST',
			path: '/crumbed', 
			handler: function(request) {
				request.reply('Crumb route');
			}		
		},
		
		// disable crumbs on route
		
		{
			method: 'POST',
			path: '/crumbed', 
			handler: function(request) {
				request.reply('No crumb');
			},
			config: {
				plugins: {
					crumb: false
				}
			}		
		}
		
		// use query instead of payload
		
		{
			method: 'POST',
			path: '/crumbed', 
			handler: function(request) {
				request.reply('No crumb');
			},
			config: {
				plugins: {
					crumb: {
					    source: 'query'
					}
				}
			}		
		}
	]);
	
	server.start();

## RESTful Mode Usage

	var Hapi = require('hapi');
	
	var server = Hapi.createServer('localhost', 3000);
		
	// Add Crumb plugin
	
	server.pack.require('crumb', { restful: true}, function(err) {
   		 if (err) {
   		 	console.error('failed loading Crumb plugin');
   		 }
	});
	
	server.route([
		
		// a "crumb" cookie gets set with any request when not using views
		
		{ 
			method: 'GET',
			path: '/generate', 
			handler: function(request) {
				// return crumb if desired
				request.reply('{ "crumb": ' + request.plugins.crumb + '}');
			}
		}, 
		
		// request header "X-CSRF-Token" with crumb value must be set in request for this route
		
		{
			method: 'PUT',
			path: '/crumbed', 
			handler: function(request) {
				request.reply('Crumb route');
			}		
		},

	]);
	
	server.start();


[![Build Status](https://secure.travis-ci.org/spumko/crumb.png)](http://travis-ci.org/spumko/crumb)
