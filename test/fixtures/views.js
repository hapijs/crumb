'use strict';

module.exports = {
    viewWithoutCrumb: () => '<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2></h2></div></body></html>',
    viewWithCrumb: (crumb) => '<!DOCTYPE html><html><head><title>test</title></head><body><div><h1>hi</h1><h2>' + crumb + '</h2></div></body></html>',
    viewWithCrumbAndNoContext: (crumb) => '<!DOCTYPE html><html><head><title></title></head><body><div><h1></h1><h2>' + crumb + '</h2></div></body></html>'
};
