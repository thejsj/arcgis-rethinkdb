var request = require("request");
var bodyParser = require("body-parser");
var express = require("express");
var crypto = require("crypto");
var r = require("rethinkdb");
require('rethinkdb-init')(r);

var config = require("./config");

var app = express();
app
  .use(bodyParser.urlencoded({extended: true}))
  .use(express.static(__dirname + "/public"));

var api = "https://api.instagram.com/v1/";
var lastUpdate = 0;

console.log("Server started on port " + config.port);

var resetSubscriptions = function (cb) {
  console.log('reset subscriptions');
  request.del({url: api + "subscriptions?client_id=" + config.instagram.client + "&client_secret=" + config.instagram.secret + "&object=all"},
    function(err, response, body) {
      if (err) {
        console.log("Failed to unsubscribe:", err);
      }
      else cb();
  });
};

var subscribeToTag = function (tagName) {
  console.log('Subscribe to tag');
  var params = {
    client_id: config.instagram.client,
    client_secret: config.instagram.secret,
    verify_token: config.instagram.verify,
    object: "tag",
    aspect: "media",
    object_id: tagName,
    callback_url: "http://" + config.host + "/publish/photo"
  };
  request.post({ url: api + "subscriptions", form: params },
    function(err, response, body) {
      if (err) {
        console.log("Failed to subscribe:", err);
      }
      else {
        console.log("Subscribed to tag:", tagName);
      }
  });
};

r.init(config.database, [
 {
   name: 'instafood',
   indexes: ['time']
 }
])
.then(function(conn) {
  r.conn = conn;
  resetSubscriptions(subscribeToTag.bind(null, "food"));
})
.catch(console.log);

app
  .get("/publish/photo", function(req, res) {
    console.log('GET publish photo');
    if (req.param("hub.verify_token") == config.instagram.verify) {
      res.send(req.param("hub.challenge"));
    } else {
      res.status(500).json({err: "Verify token incorrect"});
    }
  })
  .use("/publish/photo", bodyParser.json({
    verify: function(req, res, buf) {
      var hmac = crypto.createHmac("sha1", config.instagram.secret);
      var hash = hmac.update(buf).digest("hex");
      if (req.header("X-Hub-Signature") == hash) {
        req.validOrigin = true;
      }
    }
  }))
  .post("/publish/photo", function(req, res) {
    console.log('POST Publish Photo');
    if (!req.validOrigin) {
      return res.status(500).json({err: "Invalid signature"});
    }
    var update = req.body[0];
    res.json({ success: true, kind: update.object });
    if (update.time - lastUpdate < 2) return;
    lastUpdate = update.time;
    var path = api + "tags/" + update.object_id +
      "/media/recent?client_id=" + config.instagram.client;

    // Insert a new food picture
    return r.table("instafood").insert(
      r.http(path)("data").merge(function(item) {
        return {
          time: r.now(),
          place: r.point(
            item("location")("longitude"),
            item("location")("latitude")
          ).default(null)
        };
      })
    ).run(conn)
    .finally(function() {
      if (this.conn)
        this.conn.close();
    });
  });

