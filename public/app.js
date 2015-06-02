require([
  "esri/map",
  "esri/Color",
  "esri/geometry/Polygon",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/graphic",
  "esri/InfoTemplate",
  "dojo/domReady!"
], function(
  Map,
  Color,
  Polygon,
  SimpleFillSymbol,
  SimpleLineSymbol,
  Graphic,
  InfoTemplate,
  domReady
) {

  var generateSymbol = function (regionStat, max) {
    var scaledStat = Math.log(1 + 99999 * regionStat / max) / Math.log(100000);
    var red = Math.floor(scaledStat * 255);
    var green = Math.floor(32 + 64 * scaledStat);
    var blue = Math.floor(96 - 32 * scaledStat);
    var opacity = +((0.3 + 0.7 * scaledStat).toFixed(5));
    return new SimpleFillSymbol(
      SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([red, green, blue]),
        1
      ),
      new Color([ red, green, blue, opacity])
    );
  };

  var map = new Map("map", {
    basemap: "gray",
    center: [-97.402, 35.642],
    zoom: 3
  });

  map.on('load', function () {
    var socket = io.connect();
    var max = 0;
    var min = 0;
    var count = 0;
    var infoTemplate = new InfoTemplate(
      "${city_name}, ${state_name}",
      "Area: ${area}<br>" +
      "Restaurants: ${restaurants}<br>" +
      "Population: ${population}<br>" +
      "Resaturants p/mi²:${stat}"
    );
    count = 0;
    socket.on('max', function (newMax) {
      if (map.graphics) map.graphics.clear();
      max = newMax;
    });
    socket.on('regionBatch', function (data) {
      // Add New Graphics
      data.forEach(function (region) {
        count += 1;
        var graphic = new Graphic(region.polygon);
        graphic.setSymbol(generateSymbol(region.data.stat, max));
        region.data.stat = region.data.stat.toFixed(3);
        graphic.setAttributes(region.data);
        graphic.setInfoTemplate(infoTemplate);
        map.graphics.add(graphic);
      });
    });
  });
 });


