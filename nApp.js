var request = require("request");
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
  })
  .error(function(err) {
    console.log("Error:", err);
  });
});

io.sockets.on("connection", function(socket) {
  r.connect(config.database).then(function(conn1) {
    r.conn1 = conn1;
    return r.connect(config.database);
  })
  .then(function(conn2) {
    r.conn2 = conn2;

    // Compute restaurant statistics
    return r.table("counties")
      //.eqJoin("fips", r.table("county_stats", {useOutdated: true}), {index: 'fips'}).zip() // TODO!
      //.filter(r.row('CENSUS2010POP').gt(5000)) // TODO!
      .map({
        stat: r.table('restaurants', {useOutdated: true})
          .getIntersecting(r.row('geometry'), {index: 'geometry'})
          //.pluck({properties: "cuisine"}).distinct() // TODO!
          .count().div(r.row('properties')('CENSUSAREA')), // TODO!
          //.count().div(r.row('CENSUS2010POP')), // TODO!
        geometry: r.row('geometry').toGeojson()
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
      console.log('Sending stat');
      socket.emit("stat", stat);
    };
    var closeConn1 = function() {
      //r.conn1.close();
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
    socket.emit("initialFood", result);
  })
  .error(function(err) { console.log("Failure:", err); })
  .finally(function() {
    if (r.conn2) {
      // Closing connection
      r.conn2.close();
    }
  });
});

