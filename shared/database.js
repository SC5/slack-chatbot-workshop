'use strict';

const AWS = require('aws-sdk');
const log = require('./log');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: AWS.config.region || process.env.SERVERLESS_REGION || 'us-east-1',
});

const createSession = (session) => {
  const Item = Object.assign({ status: 0 }, session);
  const params =
    Object.assign(
      { TableName: process.env.SESSIONS_TABLE_NAME },
      { Item });
  return dynamodb.put(params).promise();
};

const getSession = ({ id }) => {
  const params =
    Object.assign(
      { TableName: process.env.SESSIONS_TABLE_NAME },
      { Key: {
        id,
      } });
  return dynamodb.get(params).promise()
    .then(data => data.Item);
};

const updateSession = () => {

};

const getTeam = (id) => {
  const params =
    Object.assign(
      { TableName: process.env.TEAMS_TABLE_NAME },
      { Key: {
        team_id: id,
      } });
  return dynamodb.get(params).promise()
    .then(data => data.Item);
};

const saveTeam = (team) => {
  const params =
    Object.assign(
      { TableName: process.env.TEAMS_TABLE_NAME },
      { Item: team });
  log(params);
  return dynamodb.put(params).promise();
};

module.exports = {
  getSession,
  createSession,
  updateSession,
  getTeam,
  saveTeam,
};
