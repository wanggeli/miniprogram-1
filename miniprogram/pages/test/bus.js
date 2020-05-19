function getSidFromUrl(number) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://shanghaicity.openservice.kankanews.com/public/bus/get',
      data: {
        'idnum': number
      },
      method: 'POST',
      success(res) {
        if (res.data && res.data.sid) {
          resolve(res.data.sid);
        } else {
          reject(new Error('Not Found'))
        }
      },
      fail(error) {
        reject(error);
      }
    });
  })
}
async function getSid(number) {
  var result;
  try {
    var sid = wx.getStorageSync("sid");
    if (sid && sid[number]) {
      console.log("get sid from local storage");
      result = sid[number];
    } else {
      result = await getSidFromUrl(number);
      console.log("get sid from url");
      if (!sid) sid = {};
      sid[number] = result;
      wx.setStorageSync("sid", sid);
      console.log("save sid to local storage");
    }
  } catch (e) { }
  return result;
}

function fetchStop(stoptype, stopid, sid) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://shanghaicity.openservice.kankanews.com/public/bus/Getstop',
      data: {
        stoptype: stoptype,
        stopid: stopid + ".",
        sid: sid
      },
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      success(result) {
        result = result.data;
        if (result.length) {
          resolve(result[0]);
        } else {
          resolve(result);
        }
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

async function fetchVehicle(number, direction, stop) {
  var result = [];
  try {
    var sid = await getSid(number);
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
  } catch (e) { }
  return result;
}

module.exports.fetchVehicle = fetchVehicle;