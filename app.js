'use strict';

var express = require('express');
var randomstring = require("randomstring");
var fs = require('fs');

var app = express();

var logger = require('morgan');
app.use(logger('dev'));

var bodyParser = require('body-parser');
var session = require('express-session');

// FIXME
var port = 3000;
var mycallback = "http://FIXEME:" + port + "/callback";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
	resave: true,
	saveUninitialized: true,
	secret: 'oauth2-client'
}));


var oauth2 = require('simple-oauth2') ({
	clientID: '###############', // FIXME
	clientSecret: '#################', // FIXME
	site: 'https://portal3g.ncu.edu.tw',
	authorizationPath : '/oauth2/authorization',
	tokenPath: '/oauth2/token',
	revocationPath : '/oauth2/revoke',
});

app.get('/auth', function (req, res) {
	var randomString = randomstring.generate(24);
	req.session.randomkey = randomString;

	var authorization_uri = oauth2.authCode.authorizeURL({
		redirect_uri: mycallback,
		scope: 'identifier', //' chinese-name gender',
		state: randomString
	});

	console.log(authorization_uri);

	res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
	var code = req.query.code;

	console.log("CallBack: request URL: " + req.url);
	console.log("Code:", code);

	if (req.query.state !== req.session.randomkey) {
		res.send("State Mismatch!");
	} else {
		oauth2.authCode.getToken ({
			code: code,
			redirect_uri: mycallback,
		}, function (error, result) {
			if (error) {
				console.log('Access Token Error', error);
				res.send("Access Token Error");
			} else {
				var token = oauth2.accessToken.create(result);
				if (token) {
					console.log(token.token);
					oauth2.api('GET', '/apis/oauth/v1/info',
						{ access_token: token.token.access_token },
						function (error, result) {
							if (error) {
								res.send(error);
							} else {
								res.send(result);
							}
						}
					);
				} else {
					console.log("empty token");
				}
			}
		});
		console.log("done.");
	}
});

app.get('/', function (req, res) {
	res.send('Hello<br><a href="/auth">Log in with Portal3G</a>');
});

app.listen(port);

console.log('Express server started on port', port);
