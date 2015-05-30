var request = require("request");
var Promise = require("bluebird");
var bodyParser = require("body-parser");
var express = require("express");
var sockio = require("socket.io");
var r = require("rethinkdb");
require('rethinkdb-init')(r);

var config = require("./config");

var app = express();
app
  .use(bodyParser.urlencoded({extended: true}))
  .use(express.static(__dirname + "/public"));

var io = sockio.listen(app.listen(config.ports.http), { log: false });

r.init(config.database, [
  {
    name: "instafood",
    indexes: ["time"]
  }
])
.then(function (conn) {
  r.conn = conn;
});

io.on("connection", function(socket) {
  Promise.resolve()
  .then(function () {
    return r.connect(config.database);
  })
  .then(function(conn1) {
    r.conn1 = conn1;

    /*!
     * For every count, get restaurants inside that county
     * After getting all restaurants in the count, count the number of
     * restaurants and then divide them by the area (using the area provided
     * by the census).
     */
    return r.table("counties")
      // NOTE: Add data from the county stats table in order to be able to
      // add population
      .eqJoin("fips", r.table("county_stats", { useOutdated: true }), { index: 'fips' }).zip()
      // NOTE: Only use counties with a population of 5000+
      //.filter(r.row('CENSUS2010POP').gt(5000))
      .map(function (row) {
        return {
          restaurants: r.table('restaurants', { useOutdated: true })
            .getIntersecting(row('geometry'), { index: 'geometry' })
            //.pluck({ properties: "cuisine" }).distinct()
            .count(),
          geometry: row('geometry').toGeojson(),
          city_name: row('ctyname'),
          state_name: row('Stname'),
          population: row('CENSUS2010POP'),
          area: row('properties')('CENSUSAREA')
        };
      })
      .merge(function (row) {
        return {
          // NOTE: Resturants per-capita
          // Instead of dividing by area, you can also divide
          // stat: row('restaurants').div(r.row('population'))
          stat: row('restaurants').div(row('area'))
        };
      })
      .run(r.conn1, {
        maxBatchSeconds: 6,
        maxBatchBytes: 1024 * 64,
        firstBatchScaledownFactor: 2
      });
  })
  .then(function(cursor) {
    // Start sending out stats
    var count = 0;
    var sendStat = function(err, stat) {
      if (err) throw err;
      var myPolygon = {"geometry":{"rings":[[[-115.3125,37.96875],[-111.4453125,37.96875],
        [-99.84375,36.2109375],[-99.84375,23.90625],[-116.015625,24.609375],
        [-115.3125,37.96875]]],"spatialReference":{"wkid":4326}},
        "symbol":{"color":[0,0,0,64],"outline":{"color":[0,0,0,255],
        "width":1,"type":"esriSLS","style":"esriSLSSolid"},
        "type":"esriSFS","style":"esriSFSSolid"}};


      console.log("Region", stat);
      socket.emit("region", myPolygon);
    };
    var closeConn1 = function() {
      r.conn1.close();
      delete r.conn1;
      console.log('Query cursor finished');
    };
    cursor.each(sendStat, closeConn1);
  })
  .error(function(err) { console.log("Failure:", err); });
});
