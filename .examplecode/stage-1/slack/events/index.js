'use strict';

const database = require('../../shared/database');
const log = require('../../shared/log');
const fetch = require('node-fetch');
const qs = require('querystring');

const verifyToken = (token) => {
  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    return Promise.resolve('ok');
  }
  return Promise.reject('Invalid token');
};

const createResponse = (slack) => {
  const payload = {
    statusCode: 200,
  };
  if (slack.type && slack.type === 'url_verification') {
    Object.assign(payload, {
      headers: {
        'content-type': 'text/plain',
      },
      body: slack.challenge,
    });
  }
  return payload;
};

const sendResponse = (params) =>
  fetch(`https://slack.com/api/chat.postMessage?${qs.stringify(params)}`)
    .then(response => response.json())
    .then((response) => {
      if (response.ok !== true) {
        throw new Error('Slack connection error');
      }
      return true;
    });

const checkBotMention = (slack) => {
  const botnameRegExp = new RegExp(`<@${slack.team.bot.bot_user_id}>`);
  if (botnameRegExp.test(slack.event.text)) {
    return slack;
  }
  throw new Error('Bot not mentioned');
};

const removeBotMention = (slack) => {
  const botnameRegExp = new RegExp(`<@${slack.team.bot.bot_user_id}>\\s*`);
  const text = slack.event.text.replace(botnameRegExp, '');
  Object.assign(slack.event, { text });
  return slack;
};

const processMessage = (slack) => {
  if (slack.type && slack.type !== 'url_verification') {
    return database.getTeam(slack.team_id)
      .then(team => Object.assign({}, slack, { team }))
      .then(slackWithTeam => checkBotMention(slackWithTeam))
      .then(slackWithTeam => removeBotMention(slackWithTeam))
      .then(log);
  }
  return true;
};

module.exports.handler = (event, context, callback) => {
  log(event);
  const slack = JSON.parse(event.body);
  return verifyToken(slack.token)
    .then(() => processMessage(slack))
    .then(message => sendResponse({
      token: message.team.bot.bot_access_token,
      channel: message.event.channel,
      text: 'Hello Barcelona!',
    }))
    .then(() => callback(null, createResponse(slack)))
    .catch(error =>
      log(error.toString())
        .then(() => callback(null, createResponse(slack))));
};
