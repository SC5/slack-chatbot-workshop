'use strict';

const fetch = require('node-fetch');
const qs = require('querystring');
const log = require('../../shared/log');
const { saveTeam } = require('../../shared/database');

const authenticate = (event) => {
  let code = null;
  if (event.queryStringParameters && event.queryStringParameters.code) {
    code = event.queryStringParameters.code;
  } else {
    throw new Error('No code available');
  }

  const params = {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code,
  };

  const url = `https://slack.com/api/oauth.access?${qs.stringify(params)}`;
  return fetch(url)
    .then(response => response.json())
    .then(log)
    .then((json) => {
      if (json.ok === true) {
        return json;
      }
      throw new Error('Slack connection error');
    });
};

const response = (error) => ({
  statusCode: 302,
  headers: {
    Location: error
      ? `${process.env.INSTALL_CALLBACK_URL}#error`
      : `${process.env.INSTALL_CALLBACK_URL}#success`,
  },
});

module.exports.handler = (event, context, callback) =>
  authenticate(event)
    .then(saveTeam)
    .then(() => callback(null, response(null)))
    .catch(error =>
      log(error.toString())
        .then(() => callback(null, response(error))));
