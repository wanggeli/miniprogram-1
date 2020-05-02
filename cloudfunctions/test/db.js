// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

var _pool = [];
var _activeCount = 0;
var _intervalHandler = null;

function _startupInterval() {
  if (_intervalHandler) return;
  _intervalHandler = setInterval(() => {
    if (_pool.length > 0 && _activeCount < 20) {
      _activeCount++;
      var item = _pool.shift();
      if (item.curd == 'get') {
        db.collection(item.collection).doc(item.data).get().then(result => item.success(result)).catch(error => item.fail(error));
      } else if (item.curd == 'add') {
        db.collection(item.collection).add({
          data: item.data
        }).then(result => item.success(result)).catch(error => item.fail(error));
      }
    }
  }, 1);
}

function _shutdownInterval() {
  _activeCount--;
  if (_pool.length == 0 && _intervalHandler) {
    clearInterval(_intervalHandler);
    _intervalHandler = null;
  }
}

function queue(curd, collection, data) {
  _startupInterval();
  return new Promise((resolve, reject) => {
    _pool.push({
      curd: curd,
      collection: collection,
      data: data,
      success: result => {
        _shutdownInterval();
        resolve(result);
      },
      fail: error => {
        _shutdownInterval();
        reject(error)
      }
    });
  });
}

function get(collection, data) {
  return queue('get', collection, data);
}

function add(collection, data) {
  return queue('add', collection, data);
}

exports.get = get;
exports.add = add;