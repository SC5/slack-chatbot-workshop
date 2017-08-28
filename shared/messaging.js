'use strict';

const log = require('./log');
const AWS = require('aws-sdk');

const sns = new AWS.SNS({
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
});

/**
 * Gets topic arn
 * @param topicName
 */
const getTopicArn = (topicName) =>
  sns.listTopics().promise()
    .then((data) => {
      const arnRe = new RegExp(`arn:.+:${topicName}`);
      const topics = data.Topics || [];
      const matchedTopicArns =
        topics
          .reduce((result, topic) => {
            if (topic.TopicArn.match(arnRe)) {
              result.push(topic.TopicArn);
            }
            return result;
          }, []);

      if (matchedTopicArns.length > 0) {
        return matchedTopicArns[0];
      }

      return Promise.reject(`TOPIC_NOT_FOUND: ${topicName}`);
    });

/**
 * Sends notification
 * @param topicName
 * @param message
 * @param attributes
 * @param subject
 */
const sendMessage = (topicName, { message, attributes, subject }) =>
  getTopicArn(topicName)
    .then((topicArn) => {
      log('top', topicArn);
      log('message', message);
      Object.assign(message, {
        stage: process.env.SERVERLESS_STAGE,
      });
      const snsNotification = {
        Message: JSON.stringify(message),
        TopicArn: topicArn,
      };

      if (attributes) {
        snsNotification.MessageAttributes = attributes;
      }

      snsNotification.Subject = subject || 'NOTIFICATION';

      if (process.env.SILENT) {
        return Promise.resolve(snsNotification);
      }

      return sns.publish(snsNotification).promise()
        .then(({ MessageId }) =>
          Object.assign({}, snsNotification, { MessageId }));
    });

/**
 * Retrieve event (SNS)
 * @param event
 * @returns {{}}
 */
const getMessage = (event) => {
  const record = event.Records ? event.Records[0] : null;
  if (record && record.Sns) {
    return JSON.parse(record.Sns.Message);
  }
  return {};
};

module.exports = {
  sendMessage,
  getMessage,
};
