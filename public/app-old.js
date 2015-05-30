require([
  "esri/map",
  "esri/geometry/Extent",
  "esri/layers/DataAdapterFeatureLayer",
  "esri/layers/FeatureLayer",
  "esri/InfoTemplate",
  "esri/renderers/SimpleRenderer",
  "esri/Color",
  "esri/geometry/Polygon",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/graphic",
  "esri/tasks/FeatureSet",
  "dojo/domReady!"
], function(
  Map,
  Extent,
  DataAdapterFeatureLayer,
  FeatureLayer,
  InfoTemplate,
  SimpleRenderer,
  Color,
  Polygon,
  SimpleFillSymbol,
  SimpleLineSymbol,
  Graphic,
  FeatureSet
) {
  var app = {};
  var usaUrl = "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer";
  var map = new Map("map", {
    basemap: "topo",  //For full list of pre-defined basemaps, navigate to http://arcg.is/1JVo6Wd
    center: [-98.35, 39.50], // longitude, latitude
    zoom: 4
  });
  var layerDefinition = {
    "geometryType": "esriGeometryPolygon",
    "fields": [{
      "name": "BUFF_DIST",
      "type": "esriFieldTypeInteger",
      "alias": "Buffer Distance"
    }]
  };
  var superSymbol = new SimpleFillSymbol(
    SimpleFillSymbol.STYLE_SOLID,
    new SimpleLineSymbol(
      SimpleLineSymbol.STYLE_SOLID,
      new Color([255,0,0,0.65]), 2
    )
  )
  .setOutline(new SimpleLineSymbol().setWidth(0.5));

  var features = [new Graphic([[-122, 35], [-122, 38], [-120, 38], [-120, 35]], superSymbol)];

  var featureSet = new FeatureSet();
  featureSet.features = features;

  var featureCollection = {
    layerDefinition: layerDefinition,
    featureSet: featureSet
  };
  var layer = new FeatureLayer(featureCollection, {
    outFields: ["*"],
    infoTemplate: new InfoTemplate("${COUNTY}, ${STATE}", "<div style='font: 18px Segoe UI'>The percentage of the area of the county that represents farmland is <b>${M086_07:NumberFormat(places:0)}%</b>.</div>")
  });

  var ws = new WebSocket('ws://localhost:9000');

  ws.onopen = function() {
    console.log('Open');
  };
  ws.onmessage = function(message) {
    var entry = JSON.parse(message.data);
    var polygon = new Polygon(entry.geometry.coordinates[0]);
    console.log(entry, polygon);
    layer.add(new Graphic(polygon, superSymbol));
    layer.redraw();
    layer.refresh();
    layer.redraw();
    layer.show();
    //console.log(message);
  };

  layer.on("load", function(){
    var renderer = new SimpleRenderer(
      new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([255,0,0,0.65]), 2
        )
      )
      .setOutline(new SimpleLineSymbol().setWidth(0.5))
    );
    //renderer.setColorInfo({
      //field: "stat",
      //minDataValue: 0,
      //maxDataValue: 100,
      //colors: [
        //new Color([255, 255, 255]),
        //new Color([127, 127, 0])
      //]
    //});
    layer.setRenderer(renderer);
    map.addLayer(layer);
  });
});


