// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = require('./db.js');
const https = require('./https.js');
const crypto = require('crypto');
const cheerio = require('cheerio');

// 云函数入口函数
exports.main = async (event, context) => {
  const {
    OPENID
  } = cloud.getWXContext();

  // if (event.key == 'fetchNumber') {
  //   var numbers = await fetchNumber();
  //   return numbers;
  // } else if (event.key == 'fetchDirection') {
  //   var directions = await fetchDirection(event.number);
  //   return directions;
  // } else if (event.key == 'fetchVehicle') {
  //   var vehicles = await fetchVehicle(event.number, event.direction, event.stop);
  //   return vehicles;
  // } else {
  //   return OPENID;
  // }
  var v1 = await fetchVehicle("44路", 1, 12);
  var v2 = await fetchVehicle("44路", 1, 14);
  var v3 = await fetchVehicle("76路", 0, 12);
  var v4 = await fetchVehicle("76路", 0, 14);
  console.log(v1);
  console.log(v2);
  console.log(v3);
  console.log(v4);
  for (var i = 0; i < v1.length; i++) {
    for (var j = 0; i < v2.length; j++) {
      if (v1[i].terminal == v2[j].terminal) {
        v1[i].stop2 = v2[j].stop;
        v1[i].time2 = v2[j].time;
        var delay = v2[j].time + 6; //walking time
        console.log(`delay ${delay}`);
        for (var k = 0; k < v3.length; k++) {
          if (v3[k].time >= delay) {
            for (var l = 0; l < v4.length; l++) {
              if (v3[k].terminal == v4[l].terminal) {
                //console.log(v1[i], v2[j], v3[k], v4[l]);
                v1[i].stop3 = v3[k].stop;
                v1[i].time3 = v3[k].time;
                v1[i].stop4 = v4[l].stop;
                v1[i].time4 = v4[l].time;
              }
              break;
            }
          }
        }
        break;
      }
    }
  }
  return v1;
}

async function test() {
  console.time('test');
  var count = 0;
  var result = {};
  var numbers = await fetchNumber();
  numbers.length = 50;
  var handler = setInterval(() => {
    while (numbers.length > 0 && count < 10) {
      count++;
      let number = numbers.shift();
      result[number] = {};
      fetchDirection(number).then(direction => {
        count--;
        console.log(direction.number);
        result[direction.number] = direction.directions;
        if (count == 0) {
          clearInterval(handler);
          console.log(result);
          console.timeEnd('test');
        }
      });
    }
    //console.log(handler);
  }, 10);
}

function fetchNumber() {
  return new Promise((resolve, reject) => {
    https.get('https://shanghaicity.openservice.kankanews.com/public/bus').then(html => {
      resolve(parseNumber(html));
    }).catch(error => {
      reject(error);
    });
  });
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

function fetchDirection(number) {
  var md5 = crypto.createHash('md5');
  var sid = md5.update(number).digest('hex');
  var bus = {
    number: number,
    directions: []
  }
  return new Promise((resolve, reject) => {
    fetchDirectionByType(sid).then(result => {
      bus.directions.push(result.direction);
      if (result.count > 1) {
        fetchDirectionByType(sid, 1).then(result => {
          bus.directions.push(result.direction);
          resolve(bus);
        }).catch(error => reject(error));
      } else {
        resolve(bus);
      }
    }).catch(error => reject(error));
  });
}

function fetchDirectionByType(sid, type) {
  type = type ? type : 0;
  var result = {};
  return new Promise((resolve, reject) => {
    https.get("https://shanghaicity.openservice.kankanews.com/public/bus/mes/sid/" + sid + (type ? "?stoptype=" + type : "")).then(html => {
      const $ = cheerio.load(html);
      var directions = $(".busDirection").find(".upgoing");
      result.count = directions.length;
      result.direction = {
        stations: []
      };
      var direction = directions.length >= type + 1 ? directions[type] : null;
      if (direction) {
        $(direction).find("span").each((i, element) => {
          i == 0 ? result.direction.startStop = $(element).text() : result.direction.endStop = $(element).text();
        });
        $(direction).find("em").each((i, element) => {
          i == 0 ? result.direction.startTime = $(element).text() : result.direction.endTime = $(element).text();
        });
      }
      var stations = $(".stationBox").find(".name");
      stations.each((i, element) => {
        result.direction.stations.push($(element).text());
      });
      resolve(result);
    }).catch(error => {
      reject(error);
    });
  });
}

function fetchStop(stoptype, stopid, sid) {
  return new Promise((resolve, reject) => {
    https.form('https://shanghaicity.openservice.kankanews.com/public/bus/Getstop', {
      stoptype: stoptype,
      stopid: stopid + ".",
      sid: sid
    }).then(result => {
      result = decodeURIComponent(result);
      result = JSON.parse(result);
      if (result.length) {
        resolve(result[0]);
      } else {
        resolve(result);
        //reject(new Error("Not Found"));
      }
    }).catch(error => reject(error));
  });
}

async function fetchVehicle(number, direction, stop) {
  var result = [];
  var md5 = crypto.createHash('md5');
  var sid = md5.update(number).digest('hex');
  while (stop > 1) {
    var vehicle = await fetchStop(direction, stop, sid);
    if (!vehicle.stopdis) break;
    result.push({
      terminal: vehicle.terminal,
      stop: (result.length == 0 ? 0 : result[result.length - 1].stop) + parseInt(vehicle.stopdis),
      time: (result.length == 0 ? 0 : result[result.length - 1].time) + Math.ceil(parseInt(vehicle.time) / 60)
    });
    stop = stop - vehicle.stopdis;
  }
  return result;
}

// function getSid(number) {
//   const url = 'https://shanghaicity.openservice.kankanews.com/public/bus/get';
//   https.form(url, {
//     idnum: number
//   }).then(html => {
//     var html = JSON.parse(html);
//     console.log(number, html.sid);
//   }).catch(error => {
//     console.log(error)
//   });
// }

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