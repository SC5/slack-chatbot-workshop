'use strict';

module.exports = (...data) => {
  console.log(JSON.stringify(data, null, 2)); // eslint-disable-line no-console
  return Promise.resolve(...data);
};
