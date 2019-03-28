define(['../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../Core/DeveloperError',
    '../../Core/defaultValue',
    '../../Widgets/Drawing/DrawingTypes'], function (defined, defineProperties, destroyObject, DeveloperError,
                                                     defaultValue, DrawingTypes) {
    'use strict';

    function LocalSearch(viewer, options) {
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }
        this._viewer = viewer;
        this._scene = viewer.scene;
        options = defaultValue(options, {});
        this._showResult = defaultValue(options.showResult, true);
        this._showDynamic = defaultValue(options.showDynamic, true);
        this._callback = options.onSearchComplete;
    }

    function getPrimitives(drawingManager, primitive, i, n) {
        if (!defined(drawingManager) || !defined(primitive)) {
            return false;
        }
        if (i) {
            for (var index = 0; index < drawingManager.drawPrimitives.length; index++) {
                var primitiveOrCollection = drawingManager.drawPrimitives.get(index);
                if (primitiveOrCollection && !primitiveOrCollection.isDestroyed()) {
                    if (!primitiveOrCollection.getType) {
                        continue;
                    }
                    if (defined(primitiveOrCollection.length)) {
                        for (var s = 0; s < primitiveOrCollection.length; s++) {
                            var l = primitiveOrCollection.get(s);
                            if (l && !l.isDestroyed() && primitive === l) {
                                return true;
                            }
                        }
                    }
                }
            }
        } else {
            for (var o = 0; o < drawingManager.drawPrimitives.length; o++) {
                var a = drawingManager.drawPrimitives.get(o);
                if (a && !a.isDestroyed()) {
                    if (!a.getType) {
                        continue;
                    }
                    if (a && !a.isDestroyed() && (primitive === a || primitive === a._primitive)) {
                        if (n) {
                            n.value = a;
                        }
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function isFunction(e) {
        return '[object Function]' === Object.prototype.toString.call(e);
    }

    defineProperties(LocalSearch.prototype, {
        pageCapacity: {
            get: function () {
                return this._pagenum;
            },
            set: function (e) {
                this._pagenum = e;
            }
        },
        searchCompleteCallback: {
            set: function (e) {
                this._callback = e;
            }
        }

    });

    LocalSearch.prototype.searchDrawingManager = function (pri, manager) {
        var primitiveCollection = [];
        if (!pri.filter) {
            throw new DeveloperError('Invalid search primitive type');
        }
        //点选
        if (defined(pri.mousePosition)) {
            var o = manager.scene.pick(pri.mousePosition);
            if (o && o.primitive) {
                if (defined(o.primitive.markerPrimitive)) {
                    if (getPrimitives(manager, o.primitive.markerPrimitive, true)) {
                        primitiveCollection.push(o.primitive.markerPrimitive);
                    }
                }
                else if (defined(o.primitive.getType)) {
                    if (o.primitive.getType !== DrawingTypes.SYSTEM_GROUND) {
                        if (getPrimitives(manager, o.primitive, false)) {
                            primitiveCollection.push(o.primitive);
                        }
                    }
                }else {
                    var a = {
                        value: null
                    };
                    if (getPrimitives(manager, o.primitive, false, a)) {
                        primitiveCollection.push(a.value);
                    }
                }
            }
        }//圈选、框选
        else {
            var primitives = manager.drawPrimitives || manager._primitives;
            for (var index = 0; index < primitives.length; index++) {
                var primitive = primitives.get(index);
                if (primitive && !primitive.isDestroyed()) {
                    if (!primitive.getType) {
                        continue;
                    }
                    if (defined(primitive.length)) {
                        for (var j = 0; j < primitive.length; j++) {
                            var p = primitive.get(j);
                            if (p && !p.isDestroyed() && pri.filter(p)) {
                                primitiveCollection.push(p);
                            }
                        }
                    } else if (pri.filter(primitive)) {
                        primitiveCollection.push(primitive);
                    }
                }
            }
        }
        if (this._showResult) {
            for (var d = 0, s = 0; s < primitiveCollection.length; s++) {
                var l = primitiveCollection[s];
                if (!defined(l.length)) {
                    if (defined(l.billboard)) {
                        if (this._showDynamic) {
                            manager.drawDynamicMarker(l.billboard, d, true);
                        } else {
                            l.selectable = true;
                        }
                        d++;
                    }
                } else {
                    for (var u = 0; u < l.length; u++) {
                        var c = l.get(u);
                        if (this._showDynamic) {
                            manager.drawDynamicMarker(c.billboard, d, true);
                        } else {
                            c.selectable = true;
                        }
                        d++;
                    }
                }
            }
        }
        if (isFunction(this._callback)) {
            this._callback(primitiveCollection);
        }
    };

    LocalSearch.prototype.isDestroyed = function () {
        return false;
    };

    LocalSearch.prototype.destroy = function () {
        this._scene._searchBillboards = this._scene._searchBillboards & this._scene._searchBillboards.destroy();
        return destroyObject(this);
    };

    return LocalSearch;
});
