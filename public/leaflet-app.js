
$(document).ready(function() {

  var mapTiles = "http://{s}.tile.osm.org/{z}/{x}/{y}.png";
  var mapAttrib = "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors";

  var map = L.map("map").setView([40, -100], 4);
  var tileLayer = L.tileLayer(mapTiles, { attribution: mapAttrib }).addTo(map);
  tileLayer.setOpacity(1.0);

  $("#toggle").click(function(e) {
    $("#toggle .button").removeClass("selected");
    $(e.target).addClass("selected");
    if (e.target.id == "off-button") tileLayer.setOpacity(0.1);
    else tileLayer.setOpacity(1.0);
  });

  // Add a layer for the county stats
  var maxStat = 0.0;
  var styleFun = function(g) {
    var letters = '0123456789abcdeff'.split('');
    console.log('Geometry');
    console.log(g.geometry.stat, maxStat);
    var scaledStat = Math.log(1 + 99999 * g.geometry.stat / maxStat) / Math.log(100000);
    //var scaledStat = Math.log(1 + 99 * g.geometry.stat / maxStat) / Math.log(100);
    var red = scaledStat * 255;
    var green = 32 + 64 * scaledStat;
    var blue = 96 - 32 * scaledStat;
    var opacity = 0.3 + 0.7 * scaledStat;
    console.log(red, green, blue);
    var colorStr = "#" +
      letters[Math.floor(red / 16)] + letters[Math.floor(red) % 16] +
      letters[Math.floor(green / 16)] + letters[Math.floor(green) % 16] +
      letters[Math.floor(blue / 16)] + letters[Math.floor(blue) % 16];
    return {
      color: colorStr,
      opacity: 1.0,
      fillOpacity: opacity,
      weight: 0
    };
  };
  var countyLayer = L.geoJson([], {style: styleFun}).addTo(map);

  var template = Handlebars.compile($("#food-template").html());
  var markers = [];

  var addFood = function (food) {
    if (food.place) {
      var count = markers.unshift(L.marker(L.latLng(
          food.place.coordinates[1],
          food.place.coordinates[0])));

      map.addLayer(markers[0]);
      markers[0].bindPopup(
          "<img src=\"" + food.images.thumbnail.url + "\">",
          {minWidth: 150, minHeight: 150, autoPan: false});

      markers[0].openPopup();

      if (count > 50)
        map.removeLayer(markers.pop());
    }
  };

  var adjustStatRange = function (county) {
    if (county.stat > maxStat) {
      maxStat = county.stat;
      countyLayer.setStyle(styleFun);
    }
  };

  var addCounty = function (county) {
    var mangledCounty = county.geometry;
    mangledCounty.stat = county.stat;
    L.geoJson(mangledCounty, { style: styleFun })
      .addTo(countyLayer)
      .bindPopup('<div>' +
        '<h5>' + county.city_name + ', ' + county.state_name + '</h5>' +
        '<p>Area: ' + county.area + '</span>' +
        '<p>Population: ' + county.population + '</span>' +
        '<p>Restaurants: ' + county.restaurants + '</span>' +
        '<p>Restaurants/Area: ' + (county.restaurants/county.area).toFixed(5) + '</span>' +
      '</div>');
  };

  var socket = io.connect();

  socket.on("food", addFood);
  socket.on("initialFood", function(food) {
    food.forEach(addFood);
  });

  socket.on("stat", function(county) {
    adjustStatRange(county);
    addCounty(county);
  });

});
