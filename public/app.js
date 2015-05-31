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
    var letters = '0123456789abcdeff'.split('');
    var scaledStat = Math.log(1 + 99999 * regionStat / max) / Math.log(100000);
    var red = scaledStat * 255;
    var green = 32 + 64 * scaledStat;
    var blue = 96 - 32 * scaledStat;
    var opacity = 0.3 + 0.7 * scaledStat;
    var color = [
      letters[Math.floor(red / 16)] + letters[Math.floor(red) % 16],
      letters[Math.floor(green / 16)] + letters[Math.floor(green) % 16],
      letters[Math.floor(blue / 16)] + letters[Math.floor(blue) % 16]
    ];
    var colorString = '#' + color[0] +  color[1] + color[2] + ';';
    //console.log('%cColor: ' + colorString + ' ' + (regionStat/max), 'color: ' + colorString);
    return new SimpleFillSymbol(
      SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color(color.concat(1)),
        1
      ),
      new Color(color.concat(opacity))
    );
  };

  var map = new Map("map", {
    basemap: "gray",
    center: [-97.402, 35.642],
    zoom: 3
  });
  window.map = map;

  map.on('load', function () {
    var socket = io.connect();
    var max = -Infinity;
    var min = 0;
    var infoTemplate = new InfoTemplate(
      "${city_name}, ${state_name}",
      "Area: ${area}<br>" +
      "Restaurants: ${restaurants}<br>" +
      "Population: ${population}<br>" +
      "Resaturants p/sqm:${stat}"
    );
    window.count = 0;
    socket.on('regionBatch', function (data) {
      console.log('----------');
      console.log('regionBatch', window.count);
      console.time('regionBatch');
      var maxUpdated = false;
      // Update Max and Min
      data.forEach(function (region) {
        if (region.data.stat > max) {
          max = region.data.stat;
          maxUpdated = true;
        }
      });
      var loaded = map.graphics.loaded;
      if (maxUpdated && window.count > 0) {
        // Redraw all existing graphics
        console.log('* Update');
        console.log('isArray:', Array.isArray(map.graphics.graphics));
        console.log(map.graphics.graphics['0']);
        map.graphics.grahpics = map.graphics.graphics.filter(function (g) {
          return g.attributes !== undefined;
        });
        for (var key in map.graphics.graphics) {
          var graphic = map.graphics.graphics[key];
          if (graphic.attributes !== undefined) {
            console.log('setSymbol');
            graphic.setSymbol(generateSymbol(graphic.attributes.stat, max));
          } else {
            console.log('attributes undefined');
          }
        }
      } else {
        console.log('No Update');
      }
      // Add New Graphics
      data.forEach(function (region) {
        window.count += 1;
        var graphic = new Graphic(region.polygon);
        graphic.setSymbol(generateSymbol(region.data.stat, max));
        graphic.setAttributes(region.data);
        graphic.setInfoTemplate(infoTemplate);
        map.graphics.add(graphic);
      });
      console.timeEnd('regionBatch');
    });
  });

 });


