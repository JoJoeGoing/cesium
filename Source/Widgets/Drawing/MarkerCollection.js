define(['../../ThirdParty/when',
        '../../Core/defined',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/Cartographic',
        '../../Core/Cartesian3',
        '../../Core/Rectangle',
        '../../Core/BoundingSphere',
        '../../Core/Ray',
        '../../Core/TaskProcessor',
        '../../Scene/LabelCollection',
        '../../Scene/BillboardCollection',
        '../../Scene/HeightReference',
        './DrawingTypes',
        './MarkerPrimitive'
    ], function(when, defined, destroyObject, DeveloperError,
                defineProperties, Cartographic, Cartesian3,
                Rectangle, BoundingSphere, Ray, TaskProcessor, LabelCollection,
                BillboardCollection, HeightReference, DrawingTypes, MarkerPrimitive) {
        'use strict';

        /**
         * @alias Uni_MarkerCollection
         * @param cesiumView
         * @constructor
         */
        function MarkerCollection(cesiumView) {
            if (!defined(cesiumView)) {
                throw new DeveloperError('No viewer instance');
            }

            this._viewer = cesiumView;
            /**
             *
             * @type {LabelCollection|exports}
             * @public
             */
            this._labels = new LabelCollection({
                scene : cesiumView.scene
            });
            /**
             *
             * @type {BillboardCollection|exports}
             * @public
             */
            this._billboards = new BillboardCollection({
                scene : cesiumView.scene
            });
            this._show = true;
            this._needToResampleNextFrame = false;
            this._resampling = false;
            this._markers = [];
            this._markerImages = {};
            /**
             * @description 唯一标识
             * @public
             */
            this._dataId = void 0;
        }

        function onDestroy(markerCollection, primitive) {
            if (defined(primitive._removeCallbackFunc)) {
                primitive._removeCallbackFunc();
            }
            if (primitive) {
                primitive.destroy();
            }
        }

        defineProperties(MarkerCollection.prototype, {

            length : {
                get : function() {
                    return this._markers.length;
                }
            },
            show : {
                get : function() {
                    return this._show;
                },
                set : function(show) {
                    this._show = show;
                }
            }
        });

        MarkerCollection.prototype.getType = function() {
            return DrawingTypes.DRAWING_MARKER;
        };

        // MarkerCollection.prototype.addWithHeight = function(lon, lat, name, data, options) {
        //     options = options || {};
        //     options.lon = lon;
        //     options.lat = lat;
        //     options.name = name;
        //     // options.data = data;
        //     var primitive = new MarkerPrimitive(options, this);
        //     primitive.owner = this.owner;
        //     this._markers.push(primitive);
        //     if (defined(options.data) && defined(options.data.id)) {
        //         this._dataId = options.data.id;
        //     }
        //     return primitive;
        // };

        MarkerCollection.prototype.addModel = function(options){
            var primitive = new MarkerPrimitive(options, this);
            primitive.owner = this.owner;
            this._markers.push(primitive);
            return primitive;
        };

        // MarkerCollection.prototype.addWithHeight = function(lon, lat, height, name, data, options) {
        //     options = options || {};
        //     options.lon = lon;
        //     options.lat = lat;
        //     options.height = height;
        //     options.name = name;
        //     options.heightReference = HeightReference.NONE;
        //     //options.data = data;
        //
        //     var primitive = new MarkerPrimitive(options, this);
        //     primitive.owner = this.owner;
        //     this._markers.push(primitive);
        //     if (defined(options.data) && defined(options.data.id)) {
        //         this._dataId = options.data.id;
        //     }
        //     return primitive;
        // };

        /**
         * @method 移除指定marker点
         * @param markerPrimitive
         * @return {boolean}
         */
        MarkerCollection.prototype.remove = function(markerPrimitive) {
            if (defined(markerPrimitive) && markerPrimitive._markerCollection === this) {
                var index = this._markers.indexOf(markerPrimitive);
                if (-1 !== index) {
                    this._markers.splice(index, 1);
                    onDestroy(this, markerPrimitive);
                    return true;
                }
            }
            return false;
        };

        /**
         * @method 删除marker集合
         * @param {Array.<MarkerPrimitive>} markerPrimitives
         * @return {boolean}
         */
        MarkerCollection.prototype.removeArray = function(markerPrimitives) {
            if (!(defined(markerPrimitives) && markerPrimitives instanceof Array)) {
                return false;
            }
            for (var r = markerPrimitives.length; r > 0; r--) {
                var primitive = markerPrimitives[r - 1];
                if (defined(primitive) && primitive._markerCollection === this) {
                    var index = this._markers.indexOf(primitive);
                    if (-1 !== index) {
                        this._markers.splice(index, 1);
                        onDestroy(this, primitive);
                    }
                }
            }
            return true;
        };

        /**
         * @method 删除所有marker点
         */
        MarkerCollection.prototype.removeAll = function() {
            this._removeAllInternal();
            this._viewer.scene.refreshOnce = true;
        };

        /**
         *
         * @method 内部方法不要直接调用，调用 removeAll
         */
        MarkerCollection.prototype._removeAllInternal = function() {
            for (var e = this._markers.length, r = e; r > 0; r--) {
                var primitive = this._markers[r - 1];
                if (defined(primitive) && primitive._markerCollection === this) {
                    var index = this._markers.indexOf(primitive);
                    if (-1 !== index) {
                        this._markers.splice(index, 1);
                        onDestroy(this, primitive);
                    }
                }
            }
            this._labels.removeAll();
            this._billboards.removeAll();
            this._markers = [];
            this._markerImages = {};
        };
        /**
         * @method 查看是否有该marker点
         * @param markerPrimitive
         * @return {Boolean|boolean}
         */
        MarkerCollection.prototype.contains = function(markerPrimitive) {
            return defined(markerPrimitive) && markerPrimitive._markerCollection === this;
        };
        /**
         * @method 根据下标返回mark点
         * @param {int} index
         * @return {MarkerPrimitive}
         * @see MarkerPrimitive
         */
        MarkerCollection.prototype.get = function(index) {
            return this._markers[index];
        };

        /**
         * @method
         */
        MarkerCollection.prototype.updateClampGroundPositons = function() {
            for (var index = 0; index < this._markers.length; index++) {
                var primitive = this._markers[index];
                if (defined(primitive) && primitive._heightReference === HeightReference.CLAMP_TO_GROUND) {

                    primitive.needToUpdatePosition = true;
                }
            }
            this._viewer.scene.refreshOnce = true;
        };
        /**
         * @method 内部判断是否渲染该MarkerCollection
         * @return {boolean}
         * @private
         */
        MarkerCollection.prototype.needToRender = function() {
            if (defined(this._billboards) && this._billboards._createVertexArray) {
                return true;
            }
        };
        MarkerCollection.prototype.update = function(frameState) {
            if (this._show && !this.isDestroyed()) {
                // if (this._resampling) {
                //     for (var i = 0; i < this._markers.length; i++) {
                //         var marker = this._markers[i];
                //         if (!(!defined(marker) || marker.isDestroyed && marker.isDestroyed()) && (marker._heightReference === HeightReference.CLAMP_TO_GROUND && marker.needToUpdatePosition)) {
                //             this._needToResampleNextFrame = true;
                //             break;
                //         }
                //     }
                // } else {
                //     var UpdatedLocation = [];
                //     var needUpdateMarker = [];
                //     for (var index = 0; index < this._markers.length; index++) {
                //         var primitive = this._markers[index];
                //
                //         if (!defined(primitive) || primitive.isDestroyed && primitive.isDestroyed()) {
                //             return;
                //         } else {
                //             if (primitive._heightReference === HeightReference.CLAMP_TO_GROUND && defined(primitive.needToUpdatePosition)
                //                 && primitive.needToUpdatePosition) {
                //                 UpdatedLocation.push(primitive.position);
                //                 needUpdateMarker.push({
                //                     index : index,
                //                     id : primitive.id
                //                 });
                //             }
                //         }
                //     }
                //    // this._updatePositions(this._viewer.scene, UpdatedLocation, needUpdateMarker);
                // }
                this._billboards.update(frameState);
                this._labels.update(frameState);
            }
        };

        // MarkerCollection.prototype._updatePositions = function(scene, positions, primitives) {
        //     if (!(primitives.length < 1)) {
        //         this._resampling = true;
        //         var markerCollection = this;
        //         var ellipsoid = scene.globe.ellipsoid;
        //
        //         if (primitives.length !== positions.length) {
        //             markerCollection._resampling = false;
        //         } else {
        //             for (var r = 0; r < primitives.length; r++) {
        //                 var primitive = primitives[r];
        //                 if (markerCollection._markers.length > primitive.index) {
        //                     var p = markerCollection._markers[primitive.index];
        //                     if (p.id !== primitive.id) {
        //                         continue;
        //                     }
        //                     if (void 0 === positions[r].height) {
        //                         positions[r].height = 0;
        //                     }
        //                     p._cartographic = positions[r];
        //                     p._position = ellipsoid.cartographicToCartesian(positions[r]);
        //                     p._showPosition(p._position);
        //                     p.needToUpdatePosition = false;
        //                 }
        //             }
        //             markerCollection._resampling = false;
        //             markerCollection._needToResampleNextFrame && (markerCollection._needToResampleNextFrame = false);
        //
        //         }
        //         scene.refreshOnce = true;
        //     }
        // };

        MarkerCollection.prototype.isDestroyed = function() {
            return false;
        };
        MarkerCollection.prototype.destroy = function() {
            this._removeAllInternal();
            this._billboards.destroy();
            this._labels.destroy();
            destroyObject(this);
        };
        return MarkerCollection;
    }
);
