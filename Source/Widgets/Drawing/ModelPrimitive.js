define(['../../Core/defined',
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
        '../../Core/Transforms',
        '../../Core/getBaseUri',
        '../../Core/RequestScheduler',
        '../../Core/RequestType',
        '../../Core/HeadingPitchRoll',
        '../../Scene/HeightReference',
        '../../Scene/VerticalOrigin',
        '../../Scene/HorizontalOrigin',
        '../../Scene/LabelStyle',
        '../../Scene/Model',
        '../../DataSources/Entity',
        '../../DataSources/CallbackProperty',
        '../../Renderer/Pass',
        './DrawingTypes',
        './Direction'],
    function (defined, editable, DeveloperError,
              defineProperties, defaultValue, Color,
              Cartesian2, Cartesian3, Cartographic,
              buildModuleUrl, CesiumMath, Rectangle,
              Ellipsoid, ScreenSpaceEventType, ScreenSpaceEventHandler,
              Transforms, getBaseUri, RequestScheduler,
              RequestType, HeadingPitchRoll, HeightReference,
              VerticalOrigin, HorizontalOrigin, LabelStyle,
              Model, Entity, CallbackProperty,
              Pass, DrawingTypes, Direction
    ) {
        'use strict';

     //   var defaultUrl = buildModuleUrl('Widgets/Images/blue.glb');

        /**
         * @alias Uni_ModelPrimitive
         * @param options
         * @param [options.viewer] Cesium Viewer
         * @param [options.url]
         * @param [options.properties] 该模型的相关属性
         * @param [options.scale]
         * @param [options.color]
         * @param [options.labelFillColor]
         * @param [options.labelOutlineWidth]
         * @param [options.labelBackgroundColor = '#000080']
         * @param [options.font = "Bold 14px Microsoft YaHei"]
         * @param [options.direction =  Direction.TOP]
         * @param [options.heightOffset = 0 ]
         * @param [options.lon = 0]
         * @param [options.lat = 0]
         * @param [options.height = 0]
         * @param [options.shadows = false]
         * @param [options.name = '']
         * @param [options.heightReference = HeightReference.CLAMP_TO_GROUND]
         * @param [options.heading = 0]
         * @param [options.pitch = 0]
         * @param [options.roll = 0]
         * @param [options.selectable = false]
         * @param [options.ellipsoid = Ellipsoid.WGS84]
         * @param [options.callback]
         * @param [options.showInfo = true]
         * @param [options.modelWidth = 30]
         * @param [options.modelHeight = 30]
         * @param modelCollection
         * @constructor
         */
        function ModelPrimitive(options, modelCollection) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            if(!defined(options.viewer)){
                throw new DeveloperError('Cesium Viewer is need !');
            }
            if (!defined(options.url)) {
                throw new DeveloperError('model url are need to set to options.url');
            }
            this._url = options.url;
            this._scale = parseFloat(defaultValue(options.scale, 1));
            this._color = defaultValue(options.color, new Color(1, 1, 1, 1));
            this._labelFillColor = defaultValue(options.labelFillColor, Color.WHITE);
            this._labelOutlineWidth = parseFloat(defaultValue(options.labelOutlineWidth, 1));
            this._labelBackgroundColor = Color.fromCssColorString(defaultValue(options.labelBackgroundColor, '#000080'));
            this._font = defaultValue(options.font, 'Bold 14px Microsoft YaHei');
            this._direction = defaultValue(options.direction, Direction.TOP);
            this._heightOffset = defaultValue(options.heightOffset, 0);
            this._heightMap = {};
            this._shadows = defaultValue(options.shadows, false);
            this._name = defaultValue(options.name, '');
            this._heightReference = defaultValue(options.heightReference, HeightReference.CLAMP_TO_GROUND);
            this._heading = defaultValue(options.heading, 0);
            this._pitch = defaultValue(options.pitch, 0);
            this._roll = defaultValue(options.roll, 0);
            this._selectable = defaultValue(options.selectable, false);
            this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
            this._drawingMode = DrawingTypes.DRAWING_MODEL;
            this._properties = defaultValue(options.properties, {});
            this._callback = defaultValue(options.callback, defaultCallback);
            this._imageWidth = defaultValue(options.modelWidth, 30);
            this._imageHeight = defaultValue(options.modelHeight, 30);
            this._content = options;
            this._modelCollection = modelCollection;

            var self = this;
            var lon = defaultValue(options.lon, 0);
            var lat = defaultValue(options.lat, 0);
            var height = defaultValue(options.height, 0);
            this._cartographic = Cartographic.fromDegrees(lon, lat, height);
            this._position = Cartesian3.fromDegrees(lon, lat, height);

            // var entity = new Entity({
            //     name: this._name,
            //     position: this._position,
            //     properties: this._properties,
            //     showInfo: defaultValue(options.showInfo, true)
            // });
            // entity.description = new CallbackProperty(wrapperCallback(self._callback, this._properties), false);
            // entity.markerPrimitive = this;
            // entity.show = false;

            addModel(self, this._url, this._position, this._heading, this._pitch, this._roll, this._shadows, this._scale, this._name);

            addLabel(modelCollection, self, this._position, this._name, this._imageHeight, this._imageWidth);

        }

        function addModel(modelPrimitive, url, position, heading, pitch, roll, shadows, scale) {
            var hpr = new HeadingPitchRoll(heading, pitch, roll);
            var modelMatrix = Transforms.headingPitchRollToFixedFrame(position, hpr);
            modelPrimitive._model = Model.fromGltf({
                url: url,
                show: true,
                modelMatrix: modelMatrix,
                scale: scale,
                allowPicking: true,
                shadows: shadows
               // releaseGltfJson: true,
               // basePath: getBaseUri(url),
            });
            modelPrimitive._model.markerPrimitive = modelPrimitive;
        }

        function addLabel(modelCollection, modelPrimitive, position, text, height, width) {
            var pixelOffset = Cartesian2.ZERO;
            var verticalOrigin = VerticalOrigin.BOTTOM;
            var horizontalOrigin = HorizontalOrigin.CENTER;
            switch (modelPrimitive._direction) {
                case Direction.TOP:
                    pixelOffset = new Cartesian2(-4, -height * modelPrimitive._scale - 3);
                    verticalOrigin = VerticalOrigin.BOTTOM;
                    break;
                case Direction.BOTTOM:
                    pixelOffset = new Cartesian2(-4, 3);
                    verticalOrigin = VerticalOrigin.TOP;
                    break;
                case Direction.LEFT:
                    pixelOffset = new Cartesian2(-width * modelPrimitive._scale / 2 - 3 - 4, 0);
                    horizontalOrigin = HorizontalOrigin.RIGHT;
                    break;
                case Direction.RIGHT:
                    pixelOffset = new Cartesian2(width * modelPrimitive._scale / 2 - 4 + 3, 0);
                    horizontalOrigin = HorizontalOrigin.LEFT;
            }
            modelPrimitive._label = modelCollection._labels.add({
                position: position,
                text: text,
                font: modelPrimitive._font,
                fillColor: modelPrimitive._labelFillColor,
                outlineColor: modelPrimitive._labelFillColor,
                outlineWidth: modelPrimitive._labelOutlineWidth,
                style: LabelStyle.FILL,
                verticalOrigin: verticalOrigin,
                horizontalOrigin: horizontalOrigin,
                pixelOffset: pixelOffset,
                eyeOffset: Cartesian3.ZERO,
                backgroundColor: modelPrimitive._labelBackgroundColor,
                translucencyByDistance: modelPrimitive._translucencyByDistance,
                heightReference: HeightReference.NONE
            });
            modelPrimitive._label.markerPrimitive = modelPrimitive;
        }

        /**
         *
         * @param {Model} model
         * @param name
         * @param callback
         */
        function setListener(model, name, callback) {
            model[name] = callback;
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
            for (var i in options)
                {if (options.hasOwnProperty(i)) {
                    var n = options[i];
                    if (defined(n)) {
                        html += 'object' === typeof n ? '<tr><th>' + i + '</th><td>' + defaultCallback(n) + '</td></tr>' : '<tr><th>' + i + '</th><td>' + n + '</td></tr>';
                    }
                }}
            if (html.length > 0) {
                html = '<table class="cesium-infoBox-defaultTable"><tbody>' + html + '</tbody></table>';

            }

            return html;

        }

        defineProperties(ModelPrimitive.prototype, {
            content: {
                get: function () {
                    return this._content;
                }
            },

            model: {
                get: function () {
                    return this._model;
                }
            },

            label: {
                get: function () {
                    return this._label;
                }
            },

            position: {
                get: function () {
                    return this._position;
                },
                set: function (position) {
                    if (defined(position)) {
                        this._position = position;
                        if (defined(this._label)) {
                            this._label.position = this._position;
                        }
                        if (defined(this._model)) {
                            var r = new HeadingPitchRoll(this._heading, this._pitch, this._roll);
                            this._model.modelMatrix = Transforms.headingPitchRollToFixedFrame(this._position, r);
                        }
                        this._cartographic = this.ellipsoid.cartesianToCartographic(this._position);
                    }
                }
            },

            heading: {
                get: function () {
                    return this._heading;
                },
                set: function (heading) {
                    if (defined(heading)) {
                        this._heading = heading;
                        if (defined(this._model)) {
                            var r = new HeadingPitchRoll(this._heading, this._pitch, this._roll);
                            this._model.modelMatrix = Transforms.headingPitchRollToFixedFrame(this._position, r);

                        }
                    }
                }
            },

            pitch: {
                get: function () {
                    return this._pitch;
                },
                set: function (pitch) {
                    if (defined(pitch)) {
                        this._pitch = pitch;
                        if (defined(this._model)) {
                            var r = new HeadingPitchRoll(this._heading, this._pitch, this._roll);
                            this._model.modelMatrix = Transforms.headingPitchRollToFixedFrame(this._position, r);
                        }
                    }
                }
            },

            roll: {
                get: function () {
                    return this._roll;
                },
                set: function (roll) {
                    if (defined(roll)) {
                        this._roll = roll;
                        if (defined(this._model)) {
                            var r = new HeadingPitchRoll(this._heading, this._pitch, this._roll);
                            this._model.modelMatrix = Transforms.headingPitchRollToFixedFrame(this._position, r);
                        }
                    }
                }
            },

            selectable: {
                get: function () {
                    return this._selectable;
                },
                set: function (selectable) {
                    this._selectable = selectable;
                }
            },

            url: {
                get: function () {
                    return this._url;
                },
                set: function (url) {
                    if (this._url !== url) {
                        this._url = url;
                        var t = new HeadingPitchRoll(this._heading, this._pitch, this._roll);
                        var modelMatrix = Transforms.headingPitchRollToFixedFrame(this._position, t);
                        this._model = Model.fromGltf({
                            url: url,
                            show: true,
                            modelMatrix: modelMatrix,
                            scale: this._scale,
                            opaquePass: Pass.CESIUM_3D_TILE,
                            allowPicking: true,
                            shadows: this._shadows,
                            cull: false,
                            releaseGltfJson: true,
                            basePath: getBaseUri(url),
                            incrementallyLoadTextures: true,
                            debugShowBoundingVolume: false,
                            debugWireframe: false
                        });
                        this._model.markerPrimitive = this;
                    }
                }
            },

            Cartographic: {
                get: function () {
                    return this._cartographic;
                }
            },
            modelCollection: {
                get: function () {
                    return this._modelCollection;
                }
            },
            text: {
                get: function () {
                    return this._name;
                },
                set: function (name) {
                    this._name = name;
                    if (defined(this._label)) {
                        this._label.text = name;
                    }
                }
            },
            drawingMode: {
                get: function () {
                    return this._drawingMode;
                },
                set: function (drawingModel) {
                    this._drawingMode = drawingModel;
                }
            },
            properties: {
                get: function () {
                    return this._properties;
                },
                set: function (properties) {
                    this._properties = properties;
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
                    var t = this;
                    this._callback = callback;
                    this._billboard.id.description = new CallbackProperty(wrapperCallback(callback, t._billboard.id.properties), false);
                }
            }
        });

        ModelPrimitive.prototype.updatePosition = function (lon, lat, height) {
            height = defaultValue(height, 0);
            this._cartographic = Cartographic.fromDegrees(lon, lat, height);
            this.position = Cartesian3.fromDegrees(lon, lat, height);
            this._content.lon = lon;
            this._content.lat = lat;
            this._heightMap = {};
            this.needToUpdatePosition = true;
            if (defined(this._modelCollection)) {
                this._modelCollection._viewer.scene.refreshOnce = false;
            }
        };

        ModelPrimitive.prototype.getType = function () {
            return this._drawingMode;
        };

        ModelPrimitive.prototype._containHeight = function (e) {
            return e in this._heightMap;
        };
        ModelPrimitive.prototype._pushHeight = function (e, t) {
            this._heightMap[e] = t;
        };
        ModelPrimitive.prototype._getHeight = function (e) {
            return this._heightMap[e];
        };

        ModelPrimitive.prototype.filter = function (e) {
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
                    for (var b = 0; b < e.length; b++) {
                        var s = e.get(b);
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
                    for (var i = 0; i < e.length; i++) {
                        var m = e.get(i);
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

        ModelPrimitive.prototype.toLonLats = function (result) {
            var r = this.ellipsoid.cartesianToCartographic(this.position);
            if(defined(result)){
                result.length = 1;
            }else{
                result = new Array(1);
            }
            result[0] = [CesiumMath.toDegrees(r.longitude), CesiumMath.toDegrees(r.latitude)];
            return result;
        };

        ModelPrimitive.prototype.setEditable = function (editable) {

            var drawingManager;
            editable = defaultValue(editable, true);
            this._editable = editable;

            if (defined(this.owner)) {
                drawingManager = this.owner;
                var me = this;
                if (editable) {
                    me.model.owner = drawingManager;
                    setListener(me.model, 'leftDown', function () {

                        var handler = new ScreenSpaceEventHandler(drawingManager._scene.canvas);

                        function onDrag(position) {
                            drawingManager._scene.refreshAlways = true;
                            me.position = position;
                        }

                        function onDragEnd(position) {
                            handler.destroy();
                            startDrawing(true);
                            drawingManager._dispatchOverlayEdited(me, {
                                name: 'dragEnd',
                                positions: position
                            });
                            drawingManager._scene.refreshAlways = false;
                        }

                        handler.setInputAction(function (movement) {
                            //var position = pickGlobe(drawingManager._scene, t.endPosition, void 0, me.heightOffset);
                            var position = self._scene.camera.pickEllipsoid(movement.endPosition, Ellipsoid.WGS84);

                            if(position){
                                onDrag(position);
                            }else{
                                onDragEnd(position);
                            }

                        }, ScreenSpaceEventType.MOUSE_MOVE);

                        handler.setInputAction(function (movement) {
                            onDragEnd(self._scene.camera.pickEllipsoid(movement.position, Ellipsoid.WGS84));

                        }, ScreenSpaceEventType.LEFT_UP);

                        startDrawing(false);
                    });
                } else {
                    //removeListener(marker, 'leftDown');
                }
            }
            function startDrawing(enable) {
                drawingManager._scene.screenSpaceCameraController.enableRotate = enable;
            }

        };

        ModelPrimitive.prototype.isDestroyed = function () {
            return false;
        };

        return ModelPrimitive;
    });
