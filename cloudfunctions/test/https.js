const request = require('request');
var zlib = require('zlib');

var _pool = [];
var _activeCount = 0;
var _intervalHandler = null;

function _startupInterval() {
  if (_intervalHandler) return;
  _intervalHandler = setInterval(() => {
    if (_pool.length > 0 && _activeCount < 20) {
      _activeCount++;
      var options = _pool.shift();
      request(options, (error, response, body) => {
        _shutdownInterval();
        if (error) return options.callback(error);
        switch (response.headers['content-encoding']) {
          case 'gzip':
            zlib.gunzip(body, function(err, data) {
              options.callback(err, (err ? null : data.toString()));
            });
            break;
          case 'deflate':
            zlib.inflate(body, function(err, data) {
              options.callback(err, (err ? null : data.toString()));
            });
            break;
          default:
            options.callback(null, body.toString());
            break;
        }
      });
    }
  }, 10)
}

function _shutdownInterval() {
  _activeCount--;
  if (_pool.length == 0) {
    clearInterval(_intervalHandler);
    _intervalHandler = null;
  }
}

function queue(options) {
  _startupInterval();
  return new Promise((resolve, reject) => {
    options.headers = {
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'MicroMessenger/7.0.1380(0x27000034) Process/tools NetType/WIFI Language/zh_CN'
    }
    options.encoding = null; //使用gzip时，必须设置为null
    options.callback = (error, result) => {
      if (error) return reject(error);
      resolve(result);
    }
    _pool.push(options);
  });
}

function get(url) {
  return queue({
    method: 'get',
    url: url
  });
}

function post(url, data) {
  return queue({
    method: 'post',
    url: url,
    body: data
  });
}

function form(url, data) {
  return queue({
    method: 'post',
    url: url,
    form: data
  });
}

exports.get = get;
exports.post = post;
exports.form = form;