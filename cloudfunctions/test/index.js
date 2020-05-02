// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = require('./db.js');
const https = require('./https.js');
var crypto = require('crypto');

// 云函数入口函数
exports.main = async(event, context) => {
  const wxContext = cloud.getWXContext()
  await https.get('https://shanghaicity.openservice.kankanews.com/public/bus').then(html => {
    //fetchBus(parseNumber(html));
    console.log(parseNumber(html).length);
  }).catch(error => {
    console.log(error);
  })
  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}

function parseNumber(html) {
  var result = [];
  var x = html.indexOf('var data = [');
  var y = html.indexOf('function showalert(param){');
  try {
    var number = {};
    html = html.substring(x, y);
    html = html.split('\r\n');
    html.forEach(line => {
      x = line.indexOf('"');
      y = line.indexOf('"', x + 1);
      if (x > 0 && y > 0 && x < y) {
        line = line.substring(x + 1, y);
        if (!number[line]) {
          number[line] = true;
          result.push(line);
        }
      }
    });
    result = result.sort().sort(sortNumber);
  } catch (error) {
    console.log(error);
  }
  return result;
}

function sortNumber(a, b, partten) {
  var anum = a.match(/^[0-9]+/);
  var bnum = b.match(/^[0-9]+/);
  if (!anum && !bnum) {
    anum = a.match(/[0-9]+/);
    bnum = b.match(/[0-9]+/);
    if (!anum && !bnum) {
      return a > b
    }
    if (!anum && bnum) {
      return 1
    } else if (anum && !bnum) {
      return -1
    } else {
      var astr = a.substr(0, a.indexOf(anum[0]));
      var bstr = b.substr(0, b.indexOf(bnum[0]));
      if (astr == bstr) {
        if (anum[0].length == bnum[0].length) {
          return anum[0] - bnum[0]
        } else {
          return anum[0].length - bnum[0].length
        }
      } else {
        return a > b
      }
    }
  }
  if (!anum && bnum) {
    return 1
  } else if (anum && !bnum) {
    return -1
  } else {
    if (anum[0].length == bnum[0].length) {
      return anum[0] - bnum[0]
    } else {
      return anum[0].length - bnum[0].length
    }
  }
}

function saveToDatabase(_id, number) {
  db.get("bus", _id).then(result => {
    console.log(result);
  }).catch(error => {
    db.add("bus", {
      _id: _id,
      number: number
    }).then(result => {
      console.log(result);
    }).catch(error => {
      console.log(number, error);
    });
  })
}

function getSid(number) {
  const url = 'https://shanghaicity.openservice.kankanews.com/public/bus/get';
  https.form(url, {
    idnum: number
  }).then(html => {
    var html = JSON.parse(html);
    console.log(number, html.sid);
  }).catch(error => {
    console.log(error)
  });
}

function fetchBus(number) {
  console.log(number.length);
  for (var i = 0; i < 10; i++) {
    var item = number[i];
    var md5 = crypto.createHash('md5');
    var _id = md5.update(item).digest('hex');
    //console.log(_id, item);
    getSid(item);
  }
}