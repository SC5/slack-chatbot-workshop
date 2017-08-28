'use strict';

const AWS = require('aws-sdk');

const kms = new AWS.KMS({
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
});

const decrypt = variables =>
  Promise.all(variables.map(variable => kms.decrypt({
    CiphertextBlob: Buffer(variable, 'base64'), // eslint-disable-line new-cap
  }).promise()
    .then(data => String(data.Plaintext))
  ));

module.exports = {
  decrypt,
};
