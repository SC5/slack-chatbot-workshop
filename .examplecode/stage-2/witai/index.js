'use strict';

const log = require('../shared/log');
const Wit = require('node-wit').Wit;

const {
  getMessage,
  sendMessage,
} = require('../shared/messaging');

const witai = (event) => {
  if (event.text) {
    const client = new Wit({ accessToken: process.env.WITAI_SERVER_ACCESS_TOKEN });
    return client.message(event.text, { timezone: 'Etc/UTC' })
      .then(log)
      .then(data => ({ message: JSON.stringify(data) }));
  }
  return Promise.reject('no text');
};

module.exports.handler = (event, context, callback) => {
  const message = getMessage(event);
  return witai(message.event)
    .then((response) => {
      Object.assign(message, { responseText: response.message });
      return sendMessage(process.env.BOT_TOPIC_NAME, { message });
    })
    .then(() => callback(null, 'ok'));
};
