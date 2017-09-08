'use strict';

const fetch = require('node-fetch');
const moment = require('moment');
const qs = require('querystring');

const log = require('../shared/log');

const {
  getMessage,
  sendMessage,
} = require('../shared/messaging');

const defaultWeatherData = {
  temperature: 'unknown',
  description: 'unknown',
  location: 'unknown',
  icon: '10d',
};

const kelvinToCelsius = k => Math.round(k - 273.15);

const mapWeatherData = (data) => {
  const description = data.weather
    ? data.weather[0].description
    : defaultWeatherData.description;

  const icon = data.weather
    ? data.weather[0].icon
    : defaultWeatherData.icon;

  const temperature = data.main && data.main.temp
    ? kelvinToCelsius(data.main.temp)
    : defaultWeatherData.temperature;

  return {
    temperature,
    description,
    icon,
    location: data.name,
    date: moment(data.dt * 1000).format(),
  };
};

const mapIcon = (icon) => {
  switch (icon) {
    case '01d':
      return ':sunny:';
    case '01n':
      return ':sunny:';
    case '02d':
      return ':sun_small_cloud:';
    case '02n':
      return ':sun_small_cloud:';
    case '03d':
      return ':sun_behind_cloud:';
    case '03n':
      return ':sun_behind_cloud:';
    case '04d':
      return ':cloud:';
    case '04n':
      return ':cloud:';
    case '09d':
      return ':rain_cloud:';
    case '10d':
      return ':partly_sunny_rain:';
    case '11d':
      return ':thunder_cloud_and_rain:';
    case '13d':
      return ':snow_cloud:';
    case '50d':
      return ':fog:';
    default:
      return ':partly_sunny_rain:';
  }
};

const createResponse = (data) =>
  `${moment(data.datetime).calendar()} in ${data.locationName}:\n${mapIcon(data.icon)} ${data.description} and ${data.temperature}°C.`;

const weatherByLocationName = (locationName) => {
  const params = {
    q: locationName,
    APPID: process.env.OPENWEATHERMAP_API_KEY,
  };

  return fetch(`http://api.openweathermap.org/data/2.5/weather?${qs.stringify(params)}`)
    .then(res => res.json())
    .then(mapWeatherData);
};

const forecastByLocationName = (locationName, datetime) => {
  const time = moment(datetime);
  const timestampInSecondsStart = time.valueOf() / 1000;
  const timestampInSecondsEnd = time.add(3, 'hours').valueOf() / 1000;
  const params = {
    q: locationName,
    APPID: process.env.OPENWEATHERMAP_API_KEY,
  };

  return fetch(`http://api.openweathermap.org/data/2.5/forecast?${qs.stringify(params)}`)
    .then(result => result.json())
    .then((data) => {
      const forecastsInDatetime = data.list.slice().filter(({ dt }) =>
        (dt >= timestampInSecondsStart && dt < timestampInSecondsEnd));
      log({ forecastsInDatetime });
      const weatherData = forecastsInDatetime.length > 0 ? forecastsInDatetime[0] : {};
      return mapWeatherData(weatherData);
    });
};

const getDatetime = (entities) => {
  if (entities.datetime) {
    if (entities.datetime[0].type === 'interval') {
      return entities.datetime[0].from.value;
    }
    return entities.datetime[0].value;
  }
  return Date.now();
};

module.exports.handler = (event, context, callback) => {
  const message = getMessage(event);
  const meaning = JSON.parse(getMessage(event).responseText);
  const locationName = meaning.entities.location[0].value;
  const datetime = getDatetime(meaning.entities);
  return (meaning.entities.datetime
    ? forecastByLocationName(locationName, datetime)
    : weatherByLocationName(locationName))
    .then(data =>
      Object.assign({},
        message,
        { responseText: createResponse(Object.assign({ datetime, locationName }, data)) }))
    .then(result => sendMessage(process.env.BOT_TOPIC_NAME, { message: result }))
    .then(() => callback(null, 'ok'))
    .catch(error =>
      log(error.toString())
        .then(() => callback(null, error)));
};
