
exports.generatePolygon = function (coordinates, region) {
  var polygon = {
    "geometry": {
      "rings":[
        [ ]
      ],
      // http://spatialreference.org/ref/epsg/wgs-84/
      "spatialReference": { "wkid":4326 }
    },
    "symbol":{
      "color": [255, 0, 0, 64],
      "outline": {
        "color": [255, 0, 0, 255],
        "width": 1,
        "type": "esriSLS",
        "style": "esriSLSSolid"
      },
      "type": "esriSFS",
      "style": "esriSFSSolid"
    },
    "attributes": region
  };
  polygon.geometry.rings = [coordinates];
  return polygon;
};
