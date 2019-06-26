//todo:有些js没有
define([

    '../../Core/defined',
    '../../Core/destroyObject',
    '../../Core/defaultValue',
    '../../Core/Math',
    '../../Core/Cartesian3',
    '../../Core/Cartographic',
    '../../Core/Color',
    '../../Core/ScreenSpaceEventType',
    '../../Core/ScreenSpaceEventHandler',
    '../../Core/PolygonGeometry',
    '../../Core/PolygonHierarchy',
    '../../Core/GeometryInstance',
    '../../Core/ColorGeometryInstanceAttribute',
    '../../Scene/ClassificationPrimitive',
    '../../Scene/ClassificationType',
    './pickGlobe',
    '../../Core/Resource'

], function(defined, destroyObject, defaultValue, CesiumMath,
    Cartesian3, Cartographic, Color, ScreenSpaceEventType, ScreenSpaceEventHandler,
    PolygonGeometry, PolygonHierarchy, GeometryInstance, ColorGeometryInstanceAttribute,
    ClassificationPrimitive, ClassificationType, pickGlobe, Resource) {

    var featureType = {
        MultiPolygon: createMultiPolygon,
        Polygon: createPolygon
    };

    function Cesium3DTileMask(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._mouseHandler = new ScreenSpaceEventHandler(options.viewer.scene.canvas);
        this._viewer = options.viewer;
        this._tileset = options.tileset || {};
        this._url = options.url;
        this._layer = options.layer;
        this._proxy = options.proxy;
        this._color = defaultValue(options.color, Color.YELLOW.withAlpha(0.5));
        this._maskPrimitives = [];
        this._show = true;
        if (defined(this._tileset.show)) {
            this._show = this._tileset.show;
        }

        //var that = this;
        // this._tileset.tileVisible.addEventListener(function(show) {
        //     that._show = show;
        //     if (show) {
        //         that.showAll();
        //     } else {
        //         that.hideAll();
        //     }
        // });
    }

    function createPolygon(cesium3DTileMask, coordinates) {
        var i = [];
        for (var n = 0; n < coordinates.length; n++) {
            for (var o = coordinates[n], s = 0; s < o.length; s++) {
                var l = o[s];
                i.push(Cartesian3.fromDegrees(l[0], l[1]));
            }
        }
        var u = new PolygonGeometry({
            polygonHierarchy: new PolygonHierarchy(i),
            extrudedHeight: 2e3
        });
        var primitive = new ClassificationPrimitive({
            geometryInstances: new GeometryInstance({
                geometry: u,
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(cesium3DTileMask._color)
                },
                id: 'TileModelMask',
                asynchronous: true
            }),
            vertexCacheOptimize: true,
            classificationType: ClassificationType.BOTH
        });
        cesium3DTileMask._viewer.scene.primitives.add(primitive);
        cesium3DTileMask._viewer.scene.refreshOnce = true;
        return primitive;
    }

    function createMultiPolygon(cesium3DTileMask, coordinates) {
        var polygons = [];
        for (var n = 0; n < coordinates.length; n++) {
            var o = coordinates[n];
            polygons.push(createPolygon(cesium3DTileMask, o));
        }
        return polygons;
    }

    //请求获取json
    function fetchGeoJson(url) {
        var resource = Resource.createIfNeeded(url);
        return resource.fetchJson();
    }

    Cesium3DTileMask.prototype.query = function(cql_filter, success, error) {
        var url = this._url + '?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.0.0&TYPENAME=' + this._layer + '&outputFormat=json';
        if (defined(cql_filter)) {
            url = url + '&' + cql_filter;
        }
        var proxy = this._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }
        var that = this;

        fetchGeoJson(url).then(function(json) {

            for (var t = 0; t < json.features.length; t++) {
                that.createFeature(json.features[t]);
            }
            if (json.features.length > 0) {
                if (that._show) {
                    that._viewer.scene.refreshOnce = true;
                } else {
                    that.hideAll();
                }
            }
            if (success && 'function' === typeof success) {
                success(json);
            }
        }).otherwise(function(e) {
            if (error && 'function' === typeof error) {
                error(e);
            }
        });
    };

    Cesium3DTileMask.prototype.startPick = function(success, error) {
        var that = this;
        that._mouseHandler.setInputAction(function(event) {
            if (that._show) {
                var object = that._viewer.scene.pick(event.position);
                if (object && object.primitive === that._tileset) {
                    that.removeAll();
                    // var cartesian = pickGlobe(that._viewer.scene, event.position);
                    var cartesian = that._viewer.scene.pickPosition(event.position);
                    if (!defined(cartesian)) {
                        return;
                    }
                    var cartographic = Cartographic.fromCartesian(cartesian),
                        longitude = CesiumMath.toDegrees(cartographic.longitude),
                        latitude = CesiumMath.toDegrees(cartographic.latitude),
                        cql_filter = 'cql_filter=INTERSECTS(the_geom%2C%20POINT%20(' + longitude + '%20' + latitude + '))';
                    that.query(cql_filter, success, error);
                }
            }
        }, ScreenSpaceEventType.LEFT_CLICK);
    };

    Cesium3DTileMask.prototype.stopPick = function() {
        this.removeAll();
        this._mouseHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    };

    Cesium3DTileMask.prototype.hideAll = function() {
        for (var t = 0; t < this._maskPrimitives.length; t++) {
            var primitive = this._maskPrimitives[t];
            if (defined(primitive)) {
                primitive.show = false;
            }
        }
        this._viewer.scene.refreshOnce = true;
    };

    Cesium3DTileMask.prototype.showAll = function() {
        for (var t = 0; t < this._maskPrimitives.length; t++) {
            var primitive = this._maskPrimitives[t];
            if (defined(primitive)) {
                primitive.show = true;
            }
        }
        this._viewer.scene.refreshOnce = true;
    };
    Cesium3DTileMask.prototype.removeAll = function() {
        for (var t = 0; t < this._maskPrimitives.length; t++) {
            var primitive = this._maskPrimitives[t];
            if (defined(primitive)) {
                this._viewer.scene.primitives.remove(primitive);
            }
        }
        this._viewer.scene.refreshOnce = true;
    };
    Cesium3DTileMask.prototype.createFeature = function(feature) {
        var primitiveFun = featureType[feature.geometry.type];
        if (defined(primitiveFun)) {
            var i = primitiveFun(this, feature.geometry.coordinates);
            if (i instanceof Array) {
                for (var n = 0; n < i.length; n++) {
                    this._maskPrimitives.push(i[n]);
                }
            } else {
                this._maskPrimitives.push(i);
            }
        }
    };

    Cesium3DTileMask.prototype.isDestroyed = function() {
        return false;
    };
    Cesium3DTileMask.prototype.destroy = function() {
        this.hideAll();
        this._mouseHandler = this._mouseHandler && this._mouseHandler.destroy();
        this._viewer = void 0;
        this._tileset = void 0;
        destroyObject(this);

    };
    return Cesium3DTileMask;
});
