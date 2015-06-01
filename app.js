var request = require("request");
var Promise = require("bluebird");
var bodyParser = require("body-parser");
var express = require("express");
var sockio = require("socket.io");
var EventQueue = require('./event-queue');
var r = require("rethinkdb");
var utils = require('./utils');
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
    return r.table('counties_processed').max({ index: 'stat' })('stat')
     .run(r.conn);
  })
  .then(function (max) {
    socket.emit("max", max);
    return true;
  })
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
    return r.table("counties_processed")
      //.map(function (row) {
        //return {
          //fips: row('fips').coerceTo('number'),
          //restaurants: r.table('restaurants', { useOutdated: true })
            //.getIntersecting(row('geometry'), { index: 'geometry' })
            //.count(),
          //geometry: row('geometry').toGeojson(),
          //city_name: row('ctyname'),
          //state_name: row('Stname'),
          //population: row('CENSUS2010POP'),
          //area: row('properties')('CENSUSAREA')
        //};
      //})
      //.merge(function (row) {
        //return {
          //stat: row('restaurants').div(row('area'))
        //};
      //})
      .run(r.conn1, {
        maxBatchSeconds: 6,
        maxBatchBytes: 1024 * 64,
      });
  })
  .then(function(cursor) {
    var eventQueue = new EventQueue();
    var count = 0;
    var dispatchQueue = function () {
      var items = eventQueue.clear();
      items = items.map(function (item) {
        return {
          polygon: utils.generatePolygon(item.geometry.coordinates[0], item),
          data: item
        };
      });
      socket.emit("regionBatch", items);
    };
    eventQueue.on('400', dispatchQueue);
    var addStat = function(err, stat) {
      if (err) throw err;
      eventQueue.append(stat);
    };
    var finish = function() {
      dispatchQueue();
      r.conn1.close()
       .then(function () {
         delete r.conn1;
         console.log('Query cursor finished');
       })
       .catch(function () { });
    };
    cursor.each(addStat, finish);
  })
  .error(function(err) { console.log("Failure:", err); });
});
