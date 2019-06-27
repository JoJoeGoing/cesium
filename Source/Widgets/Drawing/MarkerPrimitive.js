define(['../../Core/createGuid',
    '../../Core/defined',
    '../../Core/destroyObject',
    '../../Core/DeveloperError',
    '../../Core/defineProperties',
    '../../Core/defaultValue',
    '../../Core/Color',
    '../../Core/Cartesian2',
    '../../Core/Cartesian3',
    '../../Core/Cartographic',
    '../../Core/buildModuleUrl',
    '../../Core/Math',
    '../../Core/Rectangle',
    '../../Core/Ellipsoid',
    '../../Core/ScreenSpaceEventType',
    '../../Core/ScreenSpaceEventHandler',
    '../../Scene/HeightReference',
    '../../Scene/VerticalOrigin',
    '../../Scene/HorizontalOrigin',
    '../../Scene/LabelStyle',
    '../../DataSources/Entity',
    '../../DataSources/CallbackProperty',
    '../../DataSources/createPropertyDescriptor',
    '../../DataSources/ConstantPositionProperty',
    './DrawingTypes',
    './Direction'
], function (createGuid, defined, destroyObject, DeveloperError,
             defineProperties, defaultValue, Color,
             Cartesian2, Cartesian3, Cartographic, buildModuleUrl,
             CesiumMath, Rectangle, Ellipsoid, ScreenSpaceEventType,
             ScreenSpaceEventHandler, HeightReference, VerticalOrigin, HorizontalOrigin,
             LabelStyle, Entity, CallbackProperty, createPropertyDescriptor, ConstantPositionProperty, DrawingTypes, Direction) {
    'use strict';

    /**
     *
     * @alias Uni_MarkerPrimitive
     * @param options
     * @param [options.url]
     * @param [options.heightReference]
     * @param [options.showByDistance]
     * @param [options.selectable]
     * @param [options.ellipsoid]
     * @param [options.showInfo]
     * @param [options.lon]
     * @param [options.lat]
     * @param [options.height]
     * @param [options.callback]
     * @param [options.imageWidth]
     * @param [options.imageHeight]
     * @param [options.selectImageWidth]
     * @param [options.selectImageHeight]
     * @param [options.data] data中的name属性优先级比name高
     * @param [options.name]
     * @param [options.selectUrl]
     * @param [options.color]
     * @param [options.scale]
     * @param [options.labelFillColor]
     * @param [options.labelBackgroundColor]
     * @param [options.labelOutlineWidth]
     * @param [options.labelShowBackground]
     * @param [options.padding]
     * @param [options.font]
     * @param [options.direction]
     * @param [options.heightOffset]
     * @param [options.showLabel]
     * @param markerCollection
     * @constructor
     * @see label
     */
    function MarkerPrimitive(options, markerCollection) {
        //todo:markerCollection 是否需要？
        var self = this;
        options = defaultValue(options, {});
        this.id = createGuid();
        this._url = defaultValue(options.url, buildModuleUrl('Widgets/Images/DrawingManager/Marker.png'));
        this._selectUrl = defaultValue(options.selectUrl, buildModuleUrl('Widgets/Images/DrawingManager/poi-small.png'));
        this._color = defaultValue(options.color, new Color(1, 1, 1, 1));
        this._scale = defaultValue(options.scale, 1);
        this._labelFillColor = defaultValue(options.labelFillColor, Color.WHITE);
        this._labelOutlineWidth = defaultValue(options.labelOutlineWidth, 1);
        this._labelBackgroundColor = defaultValue(options.labelBackgroundColor, Color.TRANSPARENT);
        this._lableShowBackground = defaultValue(options.labelShowBackground, true);
        this._padding = defaultValue(options.padding, 1);
        this._font = defaultValue(options.font, 'Bold 14px Microsoft YaHei');
        this._direction = defaultValue(options.direction, Direction.TOP);
        this._heightOffset = defaultValue(options.heightOffset, 0);

        if (defined(options.data) && defined(options.data.name)) {
            this._name = options.data.name;
        } else {
            this._name = defaultValue(options.name, '');
        }
        if (defined(options.data) && defined(options.data.id)) {
            this._dataId = options.data.id;
        }

        this._heightReference = defaultValue(options.heightReference, HeightReference.CLAMP_TO_GROUND);
        this._translucencyByDistance = options.showByDistance;

        this._selectable = defaultValue(options.selectable, false);
        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._drawingMode = DrawingTypes.DRAWING_MARKER;
        this._properties = defaultValue(options.data, {});
        this._showInfo = defaultValue(options.showInfo, true);
        this._showLabel = defaultValue(options.showLabel,true);
        // this._cartographic = options.position;
        // this._position = Cartographic.toCartesian(this._cartographic);
        var lon = defaultValue(options.lon, 0);
        var lat = defaultValue(options.lat, 0);
        var height = defaultValue(options.height, 0);

        var position = Cartesian3.fromDegrees(lon, lat, height);
        this._cartographic = Cartographic.fromDegrees(lon, lat, height);
        this._position = position;

        this._availability = undefined;
        this._callback = defaultValue(options.callback, defaultCallback);
        this.description = new CallbackProperty(wrapperCallback(self._callback, self._properties), false);

        this._billboard = markerCollection._billboards.add({
            position: this._position ,
            image: this._url,
            verticalOrigin: VerticalOrigin.BOTTOM,
            horizontalOrigin: HorizontalOrigin.CENTER,
            pixelOffset: Cartesian2.ZERO,
            eyeOffset: Cartesian3.ZERO,
            scale: this._scale,
            color: this._color,
            translucencyByDistance: this._translucencyByDistance,
            heightReference: HeightReference.NONE
        });

        this._label = void 0;

        this._billboard.markerPrimitive = this;

        this._imageWidth = options.imageWidth;
        this._imageHeight = options.imageHeight;

        if (this._imageWidth && this._imageHeight) {
            if (self._showLabel) {
                addLabel(markerCollection, self, self._position, self._name, this._imageHeight, this._imageWidth);
            }
        } else {
            initImage(markerCollection, this._url, function (imageWidth, imageHeight) {
                self._imageWidth = imageWidth;
                self._imageHeight = imageHeight;
                if (self._showLabel) {
                    addLabel(markerCollection, self, self._position, self._name, imageHeight, imageWidth);
                }
            });
        }
        this._selectImageWidth = options.selectImageWidth;
        this._selectImageHeight = options.selectImageHeight;

        if (this._selectImageWidth && this._selectImageHeight) {
            if (self._showLabel) {
                addLabel(markerCollection, self, self._position, self._name, this._selectImageHeight, this._selectImageWidth);
            }
        } else {
            initImage(markerCollection, this._selectUrl, function (selectImageWidth, selectImageHeight) {
                self._selectImageWidth = selectImageWidth;
                self._selectImageHeight = selectImageHeight;
                if (self._showLabel) {
                    addLabel(markerCollection, self, self._position, self._name, selectImageHeight, selectImageWidth);
                }
            });
        }

        this._content = options;
        this._markerCollection = markerCollection;
    }

    function setSelectedState(markerPrimitive, height, width) {
        if (defined(markerPrimitive._label)) {
            var pixelOffset = Cartesian2.ZERO;
            var verticalOrigin = VerticalOrigin.CENTER;
            var horizontalOrigin = HorizontalOrigin.CENTER;
            switch (markerPrimitive._direction) {
                case Direction.TOP:
                    pixelOffset = new Cartesian2(-4, -height * markerPrimitive._scale - 3);
                    verticalOrigin = VerticalOrigin.BOTTOM;
                    break;
                case Direction.BOTTOM:
                    pixelOffset = new Cartesian2(-4, 11);
                    verticalOrigin = VerticalOrigin.BOTTOM;
                    break;
                case Direction.LEFT:
                    pixelOffset = new Cartesian2(-width * markerPrimitive._scale / 2, 0);
                    horizontalOrigin = HorizontalOrigin.LEFT;
                    break;
                case Direction.RIGHT:
                    pixelOffset = new Cartesian2(width * markerPrimitive._scale / 2, 0);
                    horizontalOrigin = HorizontalOrigin.RIGHT;
            }
            markerPrimitive._label.pixelOffset = pixelOffset;
            markerPrimitive._label.verticalOrigin = verticalOrigin;
            markerPrimitive._label.horizontalOrigin = horizontalOrigin;
        }
    }

    function addLabel(markerCollection, markerPrimitive, position, text, height, width) {
        var pixelOffset = Cartesian2.ZERO;
        var verticalOrigin = VerticalOrigin.BOTTOM;
        var horizontalOrigin = HorizontalOrigin.CENTER;
        switch (markerPrimitive._direction) {
            case Direction.TOP:
                pixelOffset = new Cartesian2(-4, -height * markerPrimitive._scale - 3);
                verticalOrigin = VerticalOrigin.BOTTOM;
                break;
            case Direction.BOTTOM:
                pixelOffset = new Cartesian2(-4, 3);
                verticalOrigin = VerticalOrigin.TOP;
                break;
            case Direction.LEFT:
                pixelOffset = new Cartesian2(-width * markerPrimitive._scale / 2 - 3 - 4, 0);
                horizontalOrigin = HorizontalOrigin.RIGHT;
                break;
            case Direction.RIGHT:
                pixelOffset = new Cartesian2(width * markerPrimitive._scale / 2 - 4 + 3, 0);
                horizontalOrigin = HorizontalOrigin.LEFT;
        }
        markerPrimitive._label = markerCollection._labels.add({
            position: position,
            text: text,
            font: markerPrimitive._font,
            fillColor: markerPrimitive._labelFillColor,
            outlineColor: markerPrimitive._labelFillColor,
            outlineWidth: markerPrimitive._labelOutlineWidth,
            style: LabelStyle.FILL,
            verticalOrigin: verticalOrigin,
            horizontalOrigin: horizontalOrigin,
            pixelOffset: pixelOffset,
            eyeOffset: Cartesian3.ZERO,
            backgroundColor: markerPrimitive._labelBackgroundColor,
            showBackground: markerPrimitive._lableShowBackground,
            padding: markerPrimitive._padding,
            translucencyByDistance: markerPrimitive._translucencyByDistance,
            heightReference: HeightReference.NONE
        });
        markerPrimitive._label.markerPrimitive = markerPrimitive;
    }

    /**
     *
     * @param {BillboardCollection}billboardCollection
     * @param {string}name
     * @param callback callback
     */
    function setListener(billboardCollection, name, callback) {
        billboardCollection[name] = callback;
    }

    /**
     * 便于 cesium.callbackProperty 调用callback函数
     * @param callback 回调函数
     * @param properties 回调函数的参数
     * @return {function(*, *): *}
     */
    function wrapperCallback(callback, properties) {
        return function () {
            return callback(properties);
        };
    }

    function defaultCallback(options) {
        var html = '';
        for (var option in options) {
            if (options.hasOwnProperty(option)) {
                var n = options[option];
                html += 'object' === typeof n ? '<tr><th>' + option + '</th><td>' + defaultCallback(n) + '</td></tr>' : '<tr><th>' + option + '</th><td>' + n + '</td></tr>';
            }
        }
        if (html.length > 0) {
            html = '<table class="cesium-infoBox-defaultTable"><tbody>' + html + '</tbody></table>';
        }
        return html;
    }

    function initImage(markerCollection, imageUrl, callback) {
        var image;
        if (defined(markerCollection[imageUrl])) {
            image = markerCollection[imageUrl];
            callback(image.width, image.height);
        } else {
            image = new Image();
            image.onload = function () {
                callback(image.width, image.height);
                image.onload = void 0;
                markerCollection[imageUrl] = image;
            };
            image.src = imageUrl;
        }
    }

    defineProperties(MarkerPrimitive.prototype, {

        /**
         * 返回的是构造函数中的参数options
         * @readonly
         */
        content: {
            get: function () {
                return this._content;
            }
        },
        isShowing: {
            get: function () {
                return this._showInfo;
            }
        },
        /**
         * 返回的是构造函数中参数markerCollection._billboards.add()
         * @see {Billboard}
         * @readonly
         * @see Billboard
         * @see MarkerCollection
         * @see BillboardCollection
         */
        billboard: {
            get: function () {
                return this._billboard;
            }
        },

        /**
         * marker点上方的文字
         * @see Label
         * @see LabelCollection
         */
        label: {
            get: function () {
                return this._label;
            }
        },

        properties: {
            get: function () {
                return this._properties || {};
            },

            set: function (data) {
                data = data || {};
                this._properties = data;
                var self = this;
                this.description = new CallbackProperty(wrapperCallback(self._callback, self._properties), false);
            }
        },
        selectedPosition:{
          get: function() {
              return new ConstantPositionProperty(this._position);
          }
        },
        /**
         * 在三维坐标下的位置
         * @see {Cartesian3}
         * @see Ellipsoid
         * @see HeightReference
         */
        position: {
            get: function () {
                //return new ConstantPositionProperty(this._position);
                return this._position;
            },
            set: function (position) {
                if (!defined(position)) {
                    throw new DeveloperError('Position is required.');
                }
                this._position = position;
                if (this._heightReference !== HeightReference.CLAMP_TO_GROUND) {
                    this._showPosition(position);
                } else {
                    this.needToUpdatePosition = true;
                }
                this._cartographic = this.ellipsoid.cartesianToCartographic(position);
            }
        },

        /**
         * 是否被选中，选中后可以切换image url
         */
        selectable: {
            get: function () {
                return this._selectable;
            },
            set: function (selected) {
                var imageUrl = selected ? this._selectUrl : this._url;
                setSelectedState(this, selected ? this._selectImageHeight : this._imageHeight, selected ? this._selectImageWidth : this._imageWidth);
                if (defined(this._billboard)) {
                    this._billboard.image = imageUrl;
                }
                this._selectable = selected;
            }
        },
        /**
         * marker 选中后image 的 src
         */
        selectUrl: {
            get: function () {
                return this._selectUrl;
            },
            set: function (url) {
                var self = this;
                if (this._selectUrl !== url) {
                    this._selectUrl = url;
                    if (this.selectable && defined(this._billboard)) {
                        this._billboard.image = url;
                    }
                    initImage(this._markerCollection, this._selectUrl, function (width, height) {
                        self._selectImageWidth = width;
                        self._selectImageHeight = height;
                        if (self.selectable) {
                            setSelectedState(self, height, width);
                        }
                    });
                }
            }
        },

        /**
         * marker 点 image  src
         *
         */
        url: {
            get: function () {
                return this._url;
            },
            set: function (imag) {
                var self = this;
                if (this._url !== imag) {
                    this._url = imag;
                    if (!this.selectable && defined(this._billboard)) {
                        this._billboard.image = imag;
                    }
                    initImage(this._markerCollection, imag, function (width, height) {
                        self._imageWidth = width;
                        self._imageHeight = height;
                        if (self._showLabel) {
                            addLabel(self._markerCollection, self, self._position, self._name, self._imageHeight, self._imageWidth);
                        }
                        if (!self.selectable) {
                            setSelectedState(self, height, width);
                        }
                    });
                }
            }
        },

        /**
         * Gets or sets near and far translucency properties of a Label based on the Label's distance from the camera
         * @see Label
         * @see NearFarScalar
         */
        showByDistance: {
            get: function () {
                return this._translucencyByDistance;
            },
            set: function (showByDistance) {
                if (this._translucencyByDistance !== showByDistance) {
                    this._translucencyByDistance = showByDistance;
                    if (defined(this._billboard)) {
                        this._billboard.translucencyByDistance = showByDistance;
                    }
                    if (defined(this._label)) {
                        this._label.translucencyByDistance = showByDistance;
                    }
                }
            }
        },
        /**
         * image 宽高
         */
        imageSize: {
            get: function () {
                return {
                    width: this._imageWidth,
                    height: this._imageHeight
                };
            }
        },
        /**
         * select Image 宽高
         */
        selectImageSize: {
            get: function () {
                return {
                    width: this._selectImageWidth,
                    height: this._selectImageHeight
                };
            }
        },
        /**
         * 该marke 的经纬度
         * @see {Cartographic}
         */
        Cartographic: {
            get: function () {
                return this._cartographic;
            }
        },
        /**
         * 所有marker 点的集合
         */
        markerCollection: {
            get: function () {
                return this._markerCollection;
            }
        },
        /**
         * label.text
         * @see Label
         */
        text: {
            get: function () {
                return this._name;
            },
            set: function (text) {
                this._name = text;
                if (defined(this._label)) {
                    this._label.text = text;
                }
                if (defined(this._markerCollection)) {
                    this._markerCollection._viewer.scene.refreshOnce = true;
                }
            }
        },

        /**
         * label.text
         * @see Label
         */
        name: {
            get: function () {
                return this._name;
            },
            set: function (labelText) {
                this._name = labelText;
                if (defined(this._label)) {
                    this._label.text = labelText;
                }
                if (defined(this._markerCollection)) {
                    this._markerCollection._viewer.scene.refreshOnce = true;
                }
            }
        },
        drawingMode: {
            get: function () {
                return this._drawingMode;
            },
            set: function (drawingMode) {
                this._drawingMode = drawingMode;
            }
        },
        showInfo: {
            get: function () {
                return this._showInfo;
            },
            set: function (show) {
                this._showInfo = show;
            }
        },
        heightReference: {
            get: function () {
                return this._heightReference;
            },
            set: function (heightReference) {
                this._heightReference = heightReference;
                this.needToUpdatePosition = true;
            }
        },
        heightOffset: {
            get: function () {
                return this._heightOffset;
            },
            set: function (heightOffset) {
                this._heightOffset = heightOffset;
                this.needToUpdatePosition = true;
            }
        },
        callback: {
            get: function () {
                return this._callback;
            },
            set: function (callback) {
                var self = this;
                this._callback = callback;
                this.description = new CallbackProperty(wrapperCallback(callback, self._properties), false);
            }
        }
    });

    MarkerPrimitive.prototype.isAvailable = function (available) {
        var r = this._availability;
        return !defined(r) || r.contains(available);
    };

    MarkerPrimitive.prototype._showPosition = function (position) {
        if (defined(this._billboard)) {
            this._billboard.position = position;
        }
        if (defined(this._label)) {
            this._label.position = position;
        }
    };

    MarkerPrimitive.prototype.updatePosition = function (lon, lat, height) {
        height = defaultValue(height, 0);
        this.position = Cartesian3.fromDegrees(lon, lat, height);
        this._content.lon = lon;
        this._content.lat = lat;
        if (defined(this._markerCollection)) {
            this._markerCollection._viewer.scene.refreshOnce = true;
        }
    };

    MarkerPrimitive.prototype.getType = function () {
        return this._drawingMode;
    };

    MarkerPrimitive.prototype.filter = function (e) {
        var drawingType = e.getType();
        var cartographic = this.ellipsoid.cartesianToCartographic(this.billboard.position);
        var offset = CesiumMath.EPSILON5;
        var bounding = new Rectangle(cartographic.longitude - offset, cartographic.latitude - offset, cartographic.longitude + offset, cartographic.latitude + offset);
        if (drawingType === DrawingTypes.DRAWING_POLYLINE || drawingType === DrawingTypes.DRAWING_POLYGON) {
            if (!defined(e.positions)) {
                return false;
            }
            for (var a = 0; a < e.positions.length; a++) {
                cartographic = this.ellipsoid.cartesianToCartographic(e.positions[a], cartographic);
                if (Rectangle.contains(bounding, cartographic)) {
                    return true;
                }
            }
        }
        else if (drawingType === DrawingTypes.DRAWING_MARKER) {
            if (defined(e.length)) {
                for (var i = 0; i < e.length; i++) {
                    var s = e.get(i);
                    cartographic = this.ellipsoid.cartesianToCartographic(s.billboard.position, cartographic);
                    if (Rectangle.contains(bounding, cartographic)) {
                        return true;
                    }
                }
            } else {
                cartographic = this.ellipsoid.cartesianToCartographic(e.billboard.position, cartographic);
                if (Rectangle.contains(bounding, cartographic)) {
                    return true;
                }
            }
        }
        else if (drawingType === DrawingTypes.DRAWING_MODEL) {
            if (defined(e.length)) {
                for (var l = 0; l < e.length; l++) {
                    var m = e.get(l);
                    cartographic = this.ellipsoid.cartesianToCartographic(m.position, cartographic);
                    if (Rectangle.contains(bounding, cartographic)) {
                        return true;
                    }
                }
            } else {
                cartographic = this.ellipsoid.cartesianToCartographic(e.position, cartographic);
                if (Rectangle.contains(bounding, cartographic)) {
                    return true;
                }
            }
        }
        return false;
    };
    /**
     * 将笛卡尔坐标转换为对应的经纬度坐标
     * @param {Array} result <code>result[0]<code>为所计算的经纬度
     * @return {Array}
     */
    MarkerPrimitive.prototype.toLonLats = function (result) {
        var r = this.ellipsoid.cartesianToCartographic(this._position);
        if (defined(result)) {
            result.length = 1;
        } else {
            result = new Array(1);
        }
        result[0] = [
            CesiumMath.toDegrees(r.longitude),
            CesiumMath.toDegrees(r.latitude)
        ];
        return result;
    };

    MarkerPrimitive.prototype.setEditable = function (editable) {
        var drawingManager;
        editable = defaultValue(editable, true);
        this._editable = editable;
        if (defined(this.owner)) {
            drawingManager = this.owner;
            var me = this;
            var primitive = this;
            if (editable) {
                me.billboard.owner = drawingManager;
                setListener(me.billboard, 'leftDown', function (e) {
                    var handler = new ScreenSpaceEventHandler(drawingManager._scene.canvas);

                    function onDrag(position) {
                        drawingManager._scene.refreshAlways = true;
                        me.position = position;
                    }

                    function onDragEnd(position) {
                        handler.destroy();
                        startDrawing(true);
                        drawingManager._dispatchOverlayEdited(primitive, {
                            name: 'dragEnd',
                            positions: position
                        });
                        drawingManager._scene.refreshAlways = false;
                    }

                    handler.setInputAction(function (movement) {
                        var position = self._scene.camera.pickEllipsoid(movement.endPosition, Ellipsoid.WGS84);
                        if (position) {
                            onDrag(position);
                        } else {
                            onDragEnd(position);
                        }
                    }, ScreenSpaceEventType.MOUSE_MOVE);

                    handler.setInputAction(function (movement) {
                        //onDragEnd(pickGlobe(drawingManager._scene, movement.position, undefined, me.heightOffset))
                        onDragEnd(self._scene.camera.pickEllipsoid(movement.position, Ellipsoid.WGS84));
                    }, ScreenSpaceEventType.LEFT_UP);
                    startDrawing(false);
                });
            } else {
                // removeListener(me, 'leftDown');
            }
        }

        function startDrawing(enable) {
            drawingManager._scene.screenSpaceCameraController.enableRotate = enable;
        }
    };

    MarkerPrimitive.prototype.isDestroyed = function () {
        return false;
    };

    MarkerPrimitive.prototype.destroy = function () {
        if (defined(this._label)) {
            this._label.markerPrimitive = undefined;
            this._markerCollection._labels.remove(this._label);
        }
        if (defined(this._billboard)) {

            this._billboard.markerPrimitive = void 0;
            this._markerCollection._billboards.remove(this._billboard);
            this._billboard._destroy();
        }
        this._markerCollection = void 0;
        this._content = undefined;
        this.owner = undefined;
        destroyObject(this);
    };
    return MarkerPrimitive;
});
