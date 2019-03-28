define([
    '../../Core/Color',
    '../../Scene/Material',
    '../../Scene/HeightReference',
    './DrawingTypes',
    './PolylinePrimitive',
    './PolygonPrimitive',
    './CirclePrimitive',
    './ExtentPrimitive',
    './PolylinePrimitive'
], function (Color, Material, HeightReference, DrawingTypes, PolylinePrimitive, PolygonPrimitive, CirclePrimitive, ExtentPrimitive) {

    'use strict';

    var JsonHelper = {};

    function initProperties(obj) {
        var properties = {};
        if (obj.properties instanceof Array) {
            obj.properties = {};
            return;
        }
        for (var items in obj.properties) {
            if(obj.properties.hasOwnProperty(items)){
                eval('properties.' + items + '=obj.properties.' + items);
            }
        }
        obj.properties = properties;
    }

    JsonHelper.fromJson = function (str, layer, option) {
        var geoString = str.match(/"geometry":(\{.*?\})/)[1];
        var propString = str.match(/"properties":(\{.*?\})/)[1];
        var type = geoString.match(/"type":\"(.*?)\"/)[1];

        var ptString = '';
        if (type === 'Point') {
            ptString = geoString.match(/"coordinates":(\[.*?\])/)[1];
        } else {
            ptString = geoString.match(/"coordinates":(\[\[.*?\]\])/)[1];
        }

        var points = eval('(' + ptString + ')');

        var geoObj = null;
        var arr = [];

        if (type === 'Point' || type === 'PolygonComplete' || type === 'PolylineComplete' || type === 'PolylineArrow') {
            var prop = eval('(' + propString + ')');
            if (type === 'Point') {
                option = option || {};
                option.lon = points[0];
                option.lat = points[1];
                option.height = points[2] || 0;
                if (prop.modelPoint) {
                    geoObj = layer.modelCollection.addModel(option);
                } else {
                    geoObj = layer.collection.addModel(option);
                }
            } else if (type === 'PolylineComplete' || type === 'PolylineArrow') {
                for (var i = 0; i < points.length; i++) {
                    if (points[i].length === 3) {
                        for (var o = 0; o < points[i].length; o++) {
                            arr.push(points[i][o]);
                        }
                    } else if (points[i].length === 2) {
                        for (var j = 0; j < points[i].length; j++) {
                            arr.push(points[i][j]);
                        }
                        arr.push(0);
                    }
                }

                var lineoption = {
                    coordinates: arr,
                    color:  Color.fromCssColorString(prop.color),
                    width: prop.strokeWidth,
                    scene: this.viewer.scene,
                    heightReference:HeightReference.NONE
                };

                if (points[0].length === 3) {

                    geoObj = new PolylinePrimitive(lineoption, type === 'PolylineArrow');
                }
                delete prop.strokeWidth;
                delete prop.color;

            }else if (type === 'PolygonComplete') {
                for (var k = 0; k < points.length; k++) {
                    if (points[k].length === 3) {
                        for (var m = 0; m < points[k].length; m++) {
                            arr.push(points[k][m]);
                        }
                    } else if (points[k].length === 2) {
                        for (var l = 0; l < points[k].length; l++) {
                            arr.push(points[k][l]);
                        }
                        arr.push(0);
                    }
                }
                geoObj = PolygonPrimitive.fromDegrees(arr,
                    {
                        material: Material.fromType('Color', {color: Color.fromCssColorString(prop.color || 'red')})
                    });
            }
            if (geoObj.properties) {
                for (var items in prop) {
                    if (items !== '0' && items !== '1') {
                        eval('geoObj.properties.' + items + '=prop.' + items);
                    }
                }
            } else {
                geoObj.properties = prop;
            }
        } else if (type === 'Circle') {
            var x1 = points[0][0];
            var y1 = points[0][1];
            var x2 = points[1][0];
            var y2 = points[1][1];

            var radius = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)) * 100000;
            var circleString = '{"geometry":{"center":[' + x1 + ',' + y1 + '],"radius":' + radius + '},"properties":' + propString + '}';
            geoObj = CirclePrimitive.fromJson(circleString);
            if (points[0][2]) {
                geoObj.height = points[0][2] + 1;
            }
        } else if (type === 'Rectangle') {
            var rx1 = points[0][0];
            var ry1 = points[0][1];
            var rx2 = points[1][0];
            var ry2 = points[1][1];

            var jsonString = '{"geometry":{"west":' + rx1 + ',"east":' + rx2 + ',"north":' + ry1 + ',"south":' + ry2 + '},"properties":' + propString + '}';
            geoObj = ExtentPrimitive.fromJson(jsonString);
        } else {
            // geoObj = PlotPrimitive.fromJson(str);
        }

        initProperties(geoObj);
        return geoObj;
    };

    JsonHelper.plotToJson = function (feature) {
        return feature.toJson(feature);
    };

    JsonHelper.rectangleToJson = function (feature) {
        var jsonString = feature.toJson(feature);
        var json = JSON.parse(jsonString);

        var geometryString = '[' + json.geometry.west + ',' + json.geometry.north + '],[' + json.geometry.east + ',' + json.geometry.south + ']';

        var geoString = "{\"type\":\"Rectangle\",\"coordinates\":[" + geometryString + "]}";
        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        for (var items in json.properties) {
            if (json.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + json.properties[items] + '"';
            }
        }
        featureString += '}}';
        return featureString;
    };

    JsonHelper.circleToJson = function (feature) {
        var jsonString = feature.toJson(feature);
        var json = JSON.parse(jsonString);

        var geometryString = '[' + json.geometry.center.join(',') + ',' + feature.height + ']';

        var x1 = json.geometry.center[0];
        var y1 = json.geometry.center[1];
        var x2 = x1;
        var y2 = y1 - json.geometry.radius * 0.00001;

        geometryString += ',[' + x2 + ',' + y2 + ',' + feature.height + ']';

        var geoString = "{\"type\":\"Circle\",\"coordinates\":[" + geometryString + "]}";
        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        for (var items in json.properties) {
            if (json.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + json.properties[items] + '"';
            }
        }
        featureString += '}}';
        return featureString;
    };

    JsonHelper.markerToJson = function (feature) {
        var arr = feature.toLonLats();
        var geoString = "{\"type\":\"Point\",\"coordinates\":[" + arr.join(",") + "," + feature.Cartographic.height + "]}";
        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        for (var items in feature.properties) {
            if (feature.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + feature.properties[items] + '"';
            }
        }
        featureString += '}}';
        return featureString;
    };

    JsonHelper.modelToJson = function (feature) {
        var arr = feature.toLonLats();
        var geoString = "{\"type\":\"Point\",\"coordinates\":[" + arr.join(",") + "," + feature.Cartographic.height + "]}";
        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        for (var items in feature.properties) {
            if (feature.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + feature.properties[items] + '"';
            }
        }
        featureString += ',"modelPoint":true';
        featureString += '}}';
        return featureString;
    };

    JsonHelper.lineToJson = function (feature) {
        var arr = feature.toLonLats();
        var geoString = "{\"type\":\"PolylineComplete\",\"coordinates\":[";

        var positions = feature.ellipsoid.cartesianArrayToCartographicArray(feature.getPositions());
        for (var i = 0; i < arr.length; i++) {
            if (i !== 0) {
                geoString += ',';
            }
            geoString += '[' + arr[i].join(',') + ',' + positions[i].height + ']';
        }

        geoString += ']}';

        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        var c = feature.material.uniforms.color;
        featureString += '"strokeWidth":"' + feature.width + '"';
        featureString += ',"color":"' + Color.toCssColorString(c) + '"';

        for (var items in feature.properties) {
            if (feature.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + feature.properties[items] + '"';
            }
        }
        featureString += '}}';
        return featureString;
    };

    JsonHelper.polylineArrowToJson = function (feature) {
        var arr = feature.toLonLats();
        var geoString = "{\"type\":\"PolylineArrow\",\"coordinates\":[";

        var cartegraphics = feature.ellipsoid.cartesianArrayToCartographicArray(feature.getPositions());

        for (var i = 0; i < arr.length; i++) {
            if (i !== 0) {
                geoString += ',';
            }
            geoString += '[' + arr[i].join(',') + ',' + cartegraphics[i].height + ']';
        }

        geoString += ']}';

        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        var c = feature.material.uniforms.color;
        featureString += '"strokeWidth":"' + feature.width + '"';
        featureString += ',"color":"' + Color.toCssColorString(c) + '"';

        for (var items in feature.properties) {
            if (feature.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + feature.properties[items] + '"';
            }
        }
        featureString += '}}';
        return featureString;
    };

    JsonHelper.polygonToJson = function (feature) {
        var arr = feature.toLonLats();
        var geoString = "{\"type\":\"PolygonComplete\",\"coordinates\":[";

        var cartegraphics = feature.ellipsoid.cartesianArrayToCartographicArray(feature.getPositions());

        for (var i = 0; i < arr.length; i++) {
            if (i !== 0) {
                geoString += ',';
            }
            geoString += '[' + arr[i].join(',') + ',' + cartegraphics[i].height + ']';
        }

        geoString += ']}';

        var featureString = '{"type":"Feature","geometry":' + geoString + ',"properties":{';

        var c = feature.material.uniforms.color;
        featureString += '"color":"' + Color.toCssColorString(c) + '"';

        for (var items in feature.properties) {
            if (feature.properties.hasOwnProperty(items)) {
                featureString += ',';
                featureString += '"' + items + '":"' + feature.properties[items] + '"';
            }
        }
        featureString += '}}';
        return featureString;
    };

    JsonHelper.featureToJson = function (feature) {
        if (typeof(feature) === 'undefined') {
            //alert("转换对象不能为空！");
            return '';
        }
        if (typeof feature.getType !== 'function') {
            //alert("此对象不支持FeatureToJson方法");
            return '';
        }
        var type = feature.getType();

        if (type === DrawingTypes.DRAWING_MARKER) {
            return this.markerToJson(feature);
        } else if (type === DrawingTypes.DRAWING_POLYLINE_ARROW) {
            return this.polylineArrowToJson(feature);
        } else if (type === DrawingTypes.DRAWING_POLYLINE) {
            return this.lineToJson(feature);
        } else if (type === DrawingTypes.DRAWING_RECTANGLE) {
            return this.rectangleToJson(feature);
        } else if (type === DrawingTypes.DRAWING_CIRCLE) {
            return this.circleToJson(feature);
        } else if (type === DrawingTypes.DRAWING_MODEL) {
            return this.modelToJson(feature);
        }

        //alert("此对象不支持FeatureToJson方法");
        return '';

    };

    return JsonHelper;
});
