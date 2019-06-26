define([
    '../../Core/defined',
    '../../Core/destroyObject',
    '../../Core/DeveloperError',
    '../../Core/defineProperties',
    '../../Core/defaultValue',
    '../../Core/createGuid',
    '../../Core/JulianDate',
    '../../Core/Color',
    '../../Core/Ellipsoid',
    '../../Core/Cartesian3',
    '../../Core/Math',
    '../../Scene/Material',
    '../../Scene/Cesium3DTileset',
    '../../Scene/ShadowMode',
    '../../Scene/PrimitiveCollection',
    '../../DataSources/GeoJsonDataSource',
    './DrawingManager',
    './MarkerPrimitive',
    './ModelPrimitive',
    './CirclePrimitive',
    './ExtentPrimitive',
    './PolylinePrimitive',
    './PolygonPrimitive',
    './DrawingTypes',
    './MarkerCollection'
], function (defined, destroyObject, DeveloperError,
             defineProperties, defaultValue, createGuid, JulianDate,
             Color, Ellipsoid, Cartesian3, CesiumMath,
             Material, Cesium3DTileset, ShadowMode, PrimitiveCollection,
             GeoJsonDataSource, DrawingManager,
             MarkerPrimitive, ModelPrimitive, CirclePrimitive,
             ExtentPrimitive, PolylinePrimitive, PolygonPrimitive,
             DrawingTypes, MarkerCollection) {

    'use strict';

    function initProperties(obj) {
        var properties = {};
        if (obj.properties instanceof Array) {
            obj.properties = {};
            return;
        }

        for (var items in obj.properties) {
            if (obj.properties.hasOwnProperty(items)) {
                eval('properties.' + items + '=obj.properties.' + items);
            }
        }
        obj.properties = properties;
    }

    var cartesian3 = new Cartesian3();

    /**
     * 图层隐藏时，为了节约内存，会直接移除该图层下的所有。不包括模型<code>primitive<code>
     * 颜色值均为css颜色值，例如<code>#ff0000<code>
     * 访问地址为<code>url<code>
     * @alias LayerFactory
     * @param options
     * @param {string} [options.url] GeoJson 文件绝对路径
     * @param {Viewer} [options.viewer] cesium Viewer
     * @param {string} [options.imgpath] marker点中<code>billboard<code>所在目录
     * @param {string} [options.icon] marker点中<code>billboard<code>默认图标。
     * @param {string} [options.id] 图层唯一标识
     * @param {string} [options.parentId = 0] 图层父标识
     * @param {string} [options.name] 图层名并不是<code>primitive<code>的名字
     * @param {string} [options.type] 图层类别，用于加载GeoJson时进行判断，默认情况下，每个GeoJson只有一种type
     * @param {string} [options.selectUrl] 选中后的图标
     * @param {boolean} [options.show = true] 是否绘制该图层
     * @param {boolean} [options.select = true] 是否可以点击显示详细信息
     * @param {NearFarScalar} [options.showByDistance] label显示方式
     * @param {string} [options.textColor] marker点中文字的颜色
     * @param {string} [options.font = '16px Microsoft YaHei'] marker点中的文字样式
     * @param {boolean} [options.showLabel = true] marker点是否显示label框
     * @param {string} [options.fontColor] marker点中label文字颜色
     * @param {string} [options.backgroundColor] marker点中label的背景颜色
     * @param {number} [options.scale = 1] marker点的缩放大小
     * @param {string} [options.color] polyline线条颜色、绘制面填充颜色
     * @param {float}  [options.fillOpacity = 0.5] 绘制面时填充颜色的透明度
     * @param {number} [options.strokeWidth = 5] polyline 线条的宽度
     * @param {number} [options.lon] 该图层为3Dtiles时使用
     * @param {number} [options.lat] 该图层为3Dtiles时使用
     * @param {number} [options.height] 该图层为3Dtiles时使用
     * @param {function} [options.callback] 显示<code>primitive<code>的<code>properties<code>
     * @param {boolean} [options.isLeaf = true] 叶子节点，为了兼容树结构
     * @param {boolean} [options.canSetCallback = true]
     * @param [options.layersButton]
     * @constructor
     * @see PrimitiveCollection
     */

    function LayerFactory(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        if (!defined(options.viewer)) {
            throw new DeveloperError('cesium Viewer is required !');
        }
        this.url = options.url;

        this.isLeaf = defaultValue(options.isLeaf, true);

        this.canSetCallback = true;

        this.viewer = options.viewer;

        this.name = defaultValue(options.name, '未命名');

        this._guid = defaultValue(options.id, createGuid());

        this.parentId = defaultValue(options.parentId, 0);

        this._bLoadFinish = false;

        var show = defaultValue(options.show, true);

        this._primitives = new PrimitiveCollection({
            show: show,
            destroyPrimitives: true
        });
        this.viewer.scene.primitives.add(this._primitives);
        this.layersButton = options.layersButton;

        this.callback = options.callback;

        this._geoJsonOptions = options;

        this._is3Dtiles = false;

        this.setVisibility(show);
    }
    defineProperties(LayerFactory.prototype, {

        length: {
            get: function () {
                return this._primitives.length;
            }
        },
        id: {
            get: function () {
                return this._guid;
            }
        },
        show: {
            get: function () {
                return this._primitives.show;
            },
            set: function (show) {
                this._primitives.show = show;
            }
        }

    });
    LayerFactory.getNativeName = function () {
        //ie
        if ('ActiveXObject' in window) {
            if (navigator.userAgent.indexOf('MSIE') >= 0) {
                return 'IE6';
            }
            return 'IE';

        }

        var explorer = navigator.userAgent;
        //firefox
        if (explorer.indexOf('Firefox') >= 0) {
            return 'Firefox';
        }
        //Chrome
        else if (explorer.indexOf('Chrome') >= 0) {
            return 'Chrome';
        }
        // Opera
        else if (explorer.indexOf('Opera') >= 0) {
            return 'Opera';
        }
        // Safari
        else if (explorer.indexOf('Safari') >= 0) {
            return 'Safari';
        }
        // Netscape
        else if (explorer.indexOf('Netscape') >= 0) {
            return 'Netscape';
        }
    };

    /**
     *
     * @param options
     * @param collection
     * @param result
     * @returns {MarkerPrimitive|*}
     */
    LayerFactory.createMarker = function (options, collection, result) {

        result = new MarkerPrimitive(options, collection);
        initProperties(result);
        return result;
    };
    /**
     *
     * @param options
     * @param collection
     * @param result
     * @returns {ModelPrimitive|*}
     */
    LayerFactory.createModel = function (options, collection, result) {
        result = new ModelPrimitive(options, collection);
        initProperties(result);
        return result;
    };

    /**
     *
     * @param options
     * @param result
     * @returns {PolylinePrimitive|*}
     */
    LayerFactory.createPolyline = function (options, result) {
        result = new PolylinePrimitive(options);
        initProperties(result);

        return result;
    };
    /**
     *
     * @param url
     * @returns {Cesium3DTileset|exports}
     */
    LayerFactory.createTiles = function (url) {
        return new Cesium3DTileset({
            url: url
            // maximumScreenSpaceError: 1.3,
            // baseScreenSpaceError: 128,
            // skipScreenSpaceErrorFactor: 1,
            // shadows: ShadowMode.DISABLED
        });
    };
    /**
     *
     * @param options
     * @param result
     * @returns {CirclePrimitive|*}
     */
    LayerFactory.createCircle = function (options, result) {
        result = new CirclePrimitive(options);
        initProperties(result);

        return result;
    };

    /**
     *
     * @param options
     */
    LayerFactory.prototype.loadJson = function (options) {
        if (!defined(options.url) || !defined(options.type)) {
            throw new DeveloperError('the url and type is required!');
        }
        this._geoJsonOptions = options;
        this.setVisibility();
    };

    /**
     *
     * @param visible
     */
    LayerFactory.prototype.setVisibility = function (visible) {

        if (this._is3Dtiles && this.tile) {
            this.tile.show = visible;
        } else {
            this._primitives.show = visible;

            if (visible) {
                switch (this._geoJsonOptions.type) {
                    case 'point':
                        this._loadPoints(this._geoJsonOptions);
                        break;
                    case 'polyline':
                        this._loadPolyline(this._geoJsonOptions);
                        break;
                    case 'polygon':
                        this._loadPolygon(this._geoJsonOptions);
                        break;
                    case 'osgb1':
                        this._loadOsgb1(this._geoJsonOptions);
                        break;
                    case 'osgb2':
                        this._loadOsgb2(this._geoJsonOptions);
                        break;
                }
            } else {
                this.removeAll();
                if (LayerFactory.getNativeName() === 'IE') {
                    CollectGarbage();
                }
            }
        }
    };

    /**
     * @see PrimitiveCollection
     * @param primitive
     */
    LayerFactory.prototype.add = function (primitive) {
        return this._primitives.add(primitive);
    };
    /**
     *
     * @param primitive
     */
    LayerFactory.prototype.contains = function (primitive) {
        return this._primitives.contains(primitive);
    };
    /**
     *
     * @param index
     */
    LayerFactory.prototype.get = function (index) {
        return this._primitives.get(index);
    };
    /**
     *
     * @param primitive
     */
    LayerFactory.prototype.remove = function (primitive) {
        return this._primitives.remove(primitive);
    };
    /**
     *
     */
    LayerFactory.prototype.removeAll = function () {
        this._bLoadFinish = false;
        return this._primitives.removeAll();
    };
    /**
     *
     * @param primitive
     */
    LayerFactory.prototype.removeAndDestroy = function (primitive) {
        var removed = this.remove(primitive);
        if (removed && !this.destroyPrimitives) {
            primitive.destroy();
        }
        return removed;
    };

    /**
     * @private
     */
    LayerFactory.prototype.update = function (frameState) {
        if (this._bLoadFinish && this.show) {
            this._primitives.update(frameState);
        }
    };

    /**
     *
     * @returns {boolean}
     */
    LayerFactory.prototype.isDestroyed = function () {
        return false;
    };

    /**
     *
     */
    LayerFactory.prototype.destroy = function () {
        this.removeAll();
        return destroyObject(this);
    };

    LayerFactory.prototype._loadPoints = function (options) {
        var data = GeoJsonDataSource.load(options.url);
        var self = this;
        var viewer = options.viewer;
        var collection = new MarkerCollection(options.viewer);

        this._primitives.add(collection);

        data.then(function (dataSource) {

            var entities = dataSource.entities.values;
            var nowTime = JulianDate.now();

            if (typeof(options.font) === 'undefined') {
                options.font = 'Bold 14px Microsoft YaHei';
            }

            if (typeof(options.backgroundColor) === 'undefined') {
                options.backgroundColor = '#0000ff';
            }

            var fColor = Color.fromCssColorString(options.fontColor || 'red').withAlpha(1);
            var scale = parseFloat(defaultValue(options.scale, 1));

            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var cartesian = entity.position.getValue(nowTime, cartesian3);
                var cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
                var lng = CesiumMath.toDegrees(cartographic.longitude);
                var lat = CesiumMath.toDegrees(cartographic.latitude);
                var height = cartographic.height;

                var markerOption = {
                    //viewer:options.viewer,
                    showInfo: options.selectable,
                    url: entity.properties.icon ? options.imgPath + entity.properties.icon : options.imgPath + options.icon,
                    selectUrl: options.selectUrl,
                    showByDistance: options.showByDistance,
                    font: options.font,
                    labelFillColor: fColor,
                    labelBackgroundColor: options.backgroundColor,
                    name: entity.name,
                    position: cartographic,
                    scale: scale,
                    lon: lng,
                    lat: lat,
                    height: height,
                    showLabel: options.showLabel,
                    selectable: options.select,
                    color: options.color,
                    data: entity.properties.getValue(nowTime),
                    callback: self.callback

                };

              collection.addModel(markerOption);
            }

            self._bLoadFinish = true;
            viewer.scene.refreshOnce = true;
            dataSource.entities.removeAll();
            dataSource = null;
        }).otherwise(function (error) {
            console.error('点图层加载失败 : ' + error);
        });

        data = null;

    };
    /**
     *
     * @param options
     * @private
     */
    LayerFactory.prototype._loadPolyline = function (options) {
        var data = GeoJsonDataSource.load(options.url);
        var self = this;
        var viewer = options.viewer;

        data.then(function (dataSource) {
            var entities = dataSource.entities.values;
            var nowtime = JulianDate.now();

            var width =parseInt(defaultValue(options.strokeWidth, 5)) ;
            var fColor = Color.fromCssColorString(options.color || 'red').withAlpha(parseFloat(options.fillOpacity) || 0.7);

            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var positions = entity.polyline.positions.getValue(nowtime);

                var arr = [];
                for (var j = 0; j < positions.length; j++) {
                    var cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(positions[j]);
                    var lon = CesiumMath.toDegrees(cartographic.longitude);
                    var lat = CesiumMath.toDegrees(cartographic.latitude);
                    var height = cartographic.height;

                    arr.push(lon);
                    arr.push(lat);
                    arr.push(height);
                }
                if (arr.length < 6) {
                    continue;
                }

                var geoObj = PolylinePrimitive.fromDegrees(arr,
                    {
                        width: width,
                        material: Material.fromType('Color', {color: fColor})
                    });
                self.add(geoObj);
            }
            self._bLoadFinish = true;
            viewer.scene.refreshOnce = true;
            dataSource.entities.removeAll();
            dataSource = null;

        }).otherwise(function (error) {
            console.error('图层 polyline 加载失败 : ' + error);
        });
        data = null;
    };
    /**
     *
     * @param options
     * @private
     */
    LayerFactory.prototype._loadPolygon = function (options) {
        var data = GeoJsonDataSource.load(options.url);
        var self = this;
        var viewer = options.viewer;

        data.then(function (dataSource) {
            var entities = dataSource.entities.values;
            var nowTime = JulianDate.now();
            var fColor = Color.fromCssColorString(options.color || 'red').withAlpha(parseFloat(options.fillOpacity) || 0.7);
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var positions = entity.polygon.hierarchy.getValue(nowTime).positions;

                var arr = [];
                for (var j = 0; j < positions.length; j++) {
                    var cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(positions[j]);
                    var lon = CesiumMath.toDegrees(cartographic.longitude);
                    var lat = CesiumMath.toDegrees(cartographic.latitude);
                    var height = cartographic.height;

                    arr.push(lon);
                    arr.push(lat);
                    arr.push(height);
                }
                if (arr.length < 9) {
                    continue;
                }

                var geoObj = PolygonPrimitive.fromDegrees(arr,
                    {
                        material: Material.fromType('Color', {color: fColor})
                    });
                self.add(geoObj);
            }
            self._bLoadFinish = true;
            viewer.scene.refreshOnce = true;
            dataSource.entities.removeAll();
            dataSource = null;

        }).otherwise(function(error) {
            console.error('图层 polygon 加载失败 ： ' + error);
        });
        data = null;
    };
    /**
     *
     * @param options
     * @private
     */
    LayerFactory.prototype._loadOsgb1 = function (options) {

    };
    /**
     *
     * @param options
     * @private
     */
    LayerFactory.prototype._loadOsgb2 = function (options) {

        var tile = new Cesium3DTileset({
            url: options.url
        });

        this.tile = this.layersButton.addLayer(this.name, tile, true, false);

        this._is3Dtiles = true;
    };

    return LayerFactory;
});
