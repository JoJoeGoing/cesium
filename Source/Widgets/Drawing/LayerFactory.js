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
     * ͼ������ʱ��Ϊ�˽�Լ�ڴ棬��ֱ���Ƴ���ͼ���µ����С�������ģ��<code>primitive<code>
     * ��ɫֵ��Ϊcss��ɫֵ������<code>#ff0000<code>
     * ���ʵ�ַΪ<code>url<code>
     * @alias LayerFactory
     * @param options
     * @param {string} [options.url] GeoJson �ļ�����·��
     * @param {Viewer} [options.viewer] cesium Viewer
     * @param {string} [options.imgpath] marker����<code>billboard<code>����Ŀ¼
     * @param {string} [options.icon] marker����<code>billboard<code>Ĭ��ͼ�ꡣ
     * @param {string} [options.id] ͼ��Ψһ��ʶ
     * @param {string} [options.parentId = 0] ͼ�㸸��ʶ
     * @param {string} [options.name] ͼ����������<code>primitive<code>������
     * @param {string} [options.type] ͼ��������ڼ���GeoJsonʱ�����жϣ�Ĭ������£�ÿ��GeoJsonֻ��һ��type
     * @param {string} [options.selectUrl] ѡ�к��ͼ��
     * @param {boolean} [options.show = true] �Ƿ���Ƹ�ͼ��
     * @param {boolean} [options.select = true] �Ƿ���Ե����ʾ��ϸ��Ϣ
     * @param {NearFarScalar} [options.showByDistance] label��ʾ��ʽ
     * @param {string} [options.textColor] marker�������ֵ���ɫ
     * @param {string} [options.font = '16px Microsoft YaHei'] marker���е�������ʽ
     * @param {boolean} [options.showLabel = true] marker���Ƿ���ʾlabel��
     * @param {string} [options.fontColor] marker����label������ɫ
     * @param {string} [options.backgroundColor] marker����label�ı�����ɫ
     * @param {number} [options.scale = 1] marker������Ŵ�С
     * @param {string} [options.color] polyline������ɫ�������������ɫ
     * @param {float}  [options.fillOpacity = 0.5] ������ʱ�����ɫ��͸����
     * @param {number} [options.strokeWidth = 5] polyline �����Ŀ��
     * @param {number} [options.lon] ��ͼ��Ϊ3Dtilesʱʹ��
     * @param {number} [options.lat] ��ͼ��Ϊ3Dtilesʱʹ��
     * @param {number} [options.height] ��ͼ��Ϊ3Dtilesʱʹ��
     * @param {function} [options.callback] ��ʾ<code>primitive<code>��<code>properties<code>
     * @param {boolean} [options.isLeaf = true] Ҷ�ӽڵ㣬Ϊ�˼������ṹ
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

        this.name = defaultValue(options.name, 'δ����');

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
            console.error('��ͼ�����ʧ�� : ' + error);
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
            console.error('ͼ�� polyline ����ʧ�� : ' + error);
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
            console.error('ͼ�� polygon ����ʧ�� �� ' + error);
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
