define(['../../Core/createGuid',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject'
], function(createGuid, defaultValue, defined, defineProperties, destroyObject) {
    'use strict';

    /**
     * @alias Uni_DrawingCollection
     * @param {Uni_DrawingManager} drawingManager
     * @param {Array} options
     * @param {boolean} [options.show]
     * @param {boolean} [options.destroyPrimitives]
     * @constructor
     */
    function DrawingCollection(drawingManager, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._primitives = [];
        this._guid = createGuid();
        this._owner = drawingManager;
        this.show = defaultValue(options.show, true);
        this.destroyPrimitives = defaultValue(options.destroyPrimitives, true);
    }

    function getIndex(drawingCollection, primitive) {
        return drawingCollection._primitives.indexOf(primitive);
    }

    defineProperties(DrawingCollection.prototype, {
        length : {
            get : function() {
                return this._primitives.length;
            }
        }
    });
    /**
     *
     * @param collection
     * @return {*}
     */
    DrawingCollection.prototype.add = function(collection) {
        var t = collection._external = collection._external || {};
        t._composites = t._composites || {};
        t._composites[this._guid] = {
            collection : this
        };
        collection.owner = this._owner;

        // collection._editable && collection.setEditable(true);
        //
        // if (defined(collection.length)) {
        //
        //     for (var i = 0; i < collection.length; i++) {
        //         var primitive = collection.get(i);
        //         if (defined(primitive)) {
        //             primitive.owner = this._owner;
        //             primitive._editable && primitive.setEditable(true);
        //         }
        //     }
        // }
        this._primitives.push(collection);
        return collection;
    };

    DrawingCollection.prototype.findPrimitiveByDataId = function(id) {
        var primitiveArray = this._primitives;
        for (var r = 0; r < primitiveArray.length; ++r) {
            if (primitiveArray[r].hasOwnProperty('_dataId') && primitiveArray[r]._dataId === id) {
                return primitiveArray[r];
            }
        }
    };

    DrawingCollection.prototype.remove = function(primitive) {
        if (this.contains(primitive)) {
            var position = this._primitives.indexOf(primitive);
            if (-1 !== position) {
                this._primitives.splice(position, 1);
                delete primitive._external._composites[this._guid];
                if (this.destroyPrimitives) {
                    primitive.destroy();
                }
                return true;
            }
        }
        return false;
    };

    DrawingCollection.prototype.removeAndDestroy = function(primitive) {
        var t = this.remove(primitive);
        if (t && !this.destroyPrimitives) {
            primitive.destroy();
        }
        return t;
    };

    DrawingCollection.prototype.removeAll = function() {
        if (this.destroyPrimitives) {
            var primitiveArray = this._primitives;
            for (var r = 0; r < primitiveArray.length; ++r) {
                primitiveArray[r].destroy();
            }
        }
        this._primitives = [];
    };

    DrawingCollection.prototype.contains = function(e) {
        return !!(defined(e) && e._external && e._external._composites && e._external._composites[this._guid]);
    };

    DrawingCollection.prototype.raise = function(e) {
        if (defined(e)) {
            var t = getIndex(this, e);
            var i = this._primitives;
            if (t !== i.length - 1) {
                var n = i[t];
                i[t] = i[t + 1];
                i[t + 1] = n;
            }
        }
    };

    DrawingCollection.prototype.raiseToTop = function(e) {
        if (defined(e)) {
            var t = getIndex(this, e);
            var i = this._primitives;
            if (t !== i.length - 1) {
                i.splice(t, 1);
                i.push(e);
            }
        }
    };

    DrawingCollection.prototype.lower = function(e) {
        if (defined(e)) {
            var t = getIndex(this, e);
            var i = this._primitives;
            if (0 !== t) {
                var n = i[t];
                i[t] = i[t - 1];
                i[t - 1] = n;
            }
        }
    };

    DrawingCollection.prototype.lowerToBottom = function(e) {
        if (defined(e)) {
            var t = getIndex(this, e);
            var i = this._primitives;
            if (0 !== t) {
                i.splice(t, 1);
                i.unshift(e);
            }
        }
    };

    DrawingCollection.prototype.get = function(index) {
        return this._primitives[index];
    };

    DrawingCollection.prototype.update = function(frameState) {
        if (this.show) {
            for (var t = this._primitives, r = 0; r < t.length; ++r) {
                t[r].update(frameState);
            }
        }
    };

    DrawingCollection.prototype.needToRender = function() {
        for (var e = this._primitives, t = 0; t < e.length; ++t) {
            var i = e[t];
            if (defined(i.needToRender) && i.needToRender()) {
                return true;
            }
        }
    };

    DrawingCollection.prototype.isDestroyed = function() {
        return false;
    };

    DrawingCollection.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return DrawingCollection;
});
