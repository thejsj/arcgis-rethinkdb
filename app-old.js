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

var io = sockio.listen(app.listen(config.port), { log: false });
console.log("Server started on port " + config.port);

r.init(config.database, [
  {
    name: "instafood",
    indexes: ["time"]
  }
])
.then(function (conn) {
  r.conn = conn;
  // Send out notifications for new food pictures as they come in
  r.table("instafood").changes().run(r.conn)
    .then(function(cursor) {
      cursor.each(function(err, item) {
        if (item && item.new_val) {
          io.sockets.emit("food", item.new_val);
        }
      });
    });
});

io.sockets.on("connection", function(socket) {
  Promise.resolve()
  .then(function () {
    return [
      r.connect(config.database),
      r.connect(config.database)
    ];
  })
  .spread(function(conn1, conn2) {
    r.conn1 = conn1;
    r.conn2 = conn2;

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
    var sendStat = function(err, stat) {
      if (err) throw err;
      socket.emit("stat", stat);
    };
    var closeConn1 = function() {
      console.log('Close Connection #1');
      r.conn1.close();
      delete r.conn1;
    };
    cursor.each(sendStat, closeConn1);

    // Grab the 50 latest food pictures
    return r.table("instafood")
      .orderBy({index: r.desc("time")})
      .limit(50).run(r.conn2);
  })
  .then(function(cursor) { return cursor.toArray(); })
  .then(function(result) {
    console.log('InitialFood Emit');
    socket.emit("initialFood", result);
  })
  .error(function(err) { console.log("Failure:", err); })
  .finally(function() {
    console.log('Close Connection #2');
    if (r.conn2) {
      r.conn2.close();
    }
  });
});

