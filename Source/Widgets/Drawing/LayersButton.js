define(['../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../Core/DeveloperError',
    '../../Core/FeatureDetection',
    '../../Core/defaultValue'
], function (defined, defineProperties, destroyObject, DeveloperError, FeatureDetection,
             defaultValue) {
    'use strict';

    function LayersButton(cesiumView) {
        this._scene = cesiumView.scene;
        this._imageryLayers = this._scene.imageryLayers;
        this._layers = [];
    }

    defineProperties(LayersButton.prototype, {
        viewModel: {
            get: function () {
                return this._viewModel;
            }
        },
        scene: {
            get: function () {
                return this._scene;
            }
        },
        layers: {
            get: function () {
                return this._layers;
            }
        }
    });

    LayersButton.prototype.getLayer = function (layerName) {
        for (var t = 0; t < this._layers.length; t++) {
            if (this._layers[t].name === layerName) {
                return this._layers[t];
            }
        }
    };

    LayersButton.prototype.addLayer = function (layerName, providerOrPrimitive, isShow, isImageryProvider, autoAdd) {
        var layerOrPrimitive = this.getLayer(layerName);
        autoAdd = defaultValue(autoAdd,true);
        var u = false;
        if (undefined === layerOrPrimitive) {
            layerOrPrimitive = {
                items: []
            };
            u = true;
        }
        var layer;
        if (autoAdd) {
            if (isImageryProvider) {
                layer = this.scene.imageryLayers.addImageryProvider(providerOrPrimitive);
            } else {
                layer = this.scene.primitives.add(providerOrPrimitive);
            }
        }
        var show = defaultValue(isShow, true);
        layerOrPrimitive.show = show;
        layer.show = show;
        layerOrPrimitive.name = layerName;
        layerOrPrimitive.items.push(layer);
        if (u) {
            this.layers.push(layerOrPrimitive);
        }
        return layer;
    };

    LayersButton.prototype.isDestroyed = function () {
        return false;
    };

    LayersButton.prototype.destroy = function () {
        return destroyObject(this);
    };
    return LayersButton;
});
