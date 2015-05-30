require([
  "esri/map",
  "esri/layers/FeatureLayer",
  "esri/renderers/SimpleRenderer",
  "esri/Color",
  "esri/geometry/Polygon",
  "esri/geometry/Point",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/graphic",
  "esri/SpatialReference",
  "esri/tasks/FeatureSet",
  "dojo/domReady!"
], function(
  Map,
  FeatureLayer,
  SimpleRenderer,
  Color,
  Polygon,
  Point,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Graphic,
  SpatialReference,
  FeatureSet,
  domReady
) {
   var esriObject = {
     "geometry" : {
        "rings" : [[[-97.06138,32.837],[-97.06133,32.836],[-97.06124,32.834],[-97.06127,32.832],
                    [-97.06138,32.837]],[[-97.06326,32.759],[-97.06298,32.755],[-97.06153,32.749],
                    [-97.06326,32.759]]],
        "spatialReference" : {"wkid" : 4326}
      },
      "attributes" : {
        "OWNER" : "Joe Smith",
        "VALUE" : 94820.37,
        "APPROVED" : true,
        "LASTUPDATE" : 1227663551096
      }
    };

  var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
    new Color([255,0,0]), 2),new Color([255,255,0,0.25])
  );

  var map = new Map("map", {
    basemap: "gray",
    center: [-97.402, 32.642],
    zoom: 15
  });

  //map.addLayer(featureLayer);
  var point = new Point(-97.402, 32.642, new SpatialReference({wkid:4326}));
  var simpleMarkerSymbol = new SimpleMarkerSymbol();
  var graphic = new Graphic(point, simpleMarkerSymbol);

  var socket = io.connect();
  map.on('load', function () {
    console.log('Load');
    socket.on('region', function (region) {
      console.log('Region', region);
      map.graphics.add(new Graphic(region, sfs));
    });
  });

 });


