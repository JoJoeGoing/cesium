define(['../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/defaultValue',
        '../../Core/Ellipsoid',
        '../../Core/Cartesian3',
        '../../Core/Color',
        '../../Core/Cartographic',
        '../../Core/PolylineGeometry',
        '../../Core/Math',
        '../../Core/Rectangle',
        '../../Core/buildModuleUrl',
        '../../Core/ScreenSpaceEventType',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/EllipsoidGeodesic',
        '../../Core/GroundPolylineGeometry',
        '../../Scene/HeightReference',
        '../../Scene/EllipsoidSurfaceAppearance',
        '../../Scene/PolylineMaterialAppearance',
        '../../Scene/PolylineColorAppearance',
        '../../Scene/Material',
        './DrawingTypes',
        './BillboardGroup',
        './ChangeablePrimitive'], function(defined, DeveloperError, defaultValue, Ellipsoid, Cartesian3,
                                           Color, Cartographic, PolylineGeometry,
                                           Math, Extent, buildModuleUrl,
                                           ScreenSpaceEventType, ScreenSpaceEventHandler, EllipsoidGeodesic,
                                           GroundPolylineGeometry, HeightReference, EllipsoidSurfaceAppearance, PolylineMaterialAppearance, PolylineColorAppearance, Material,
                                           DrawingTypes, BillboardGroup, ChangeablePrimitive) {
    'use strict';

    var dragBillboard = {
        iconUrl : buildModuleUrl('Widgets/Images/DrawingManager/dragIcon.png'),
        shiftX : 0,
        shiftY : 0
    };
    var dragHalfBillboard = {
        iconUrl : buildModuleUrl('Widgets/Images/DrawingManager/dragIconLight.png'),
        shiftX : 0,
        shiftY : 0
    };

    /**
     * @alias Uni_PolylinePrimitive
     * @constructor
     * @param options
     * @param {boolean} arrow 是否带箭头
     */
    function PolylinePrimitive(options, arrow) {

        if (!defined(arrow)) {
            arrow = false;
        }
        this.initialiseOptions(options);
        this.granularity = defaultValue(options.granularity, 1e4);
        this.color = defaultValue(options.color, new Color(1, 1, 1, 0.5));
        this.type = arrow ? DrawingTypes.DRAWING_POLYLINE_ARROW : DrawingTypes.DRAWING_POLYLINE;

        if (defined(options.material)) {
            this.material = options.material;
        } else {
            this.material = arrow ? Material.fromType('PolylineArrow', {
                color : this.color
            }) : Material.fromType('PolylineArrow', {
                color : this.color
            });
        }
        this.appearance = new PolylineMaterialAppearance({
            material : this.material,
            translucent : this.material.isTranslucent(),
            closed : false,
            flat : true,
            renderState : {
                lineWidth : 1
            }
        });
        if (defined(options.coordinates)) {
            this.positions = Cartesian3.fromDegreesArrayHeights(options.coordinates, this.ellipsoid);
            this.coordinates = undefined;
        }
        if (defined(options.positions)) {
            this.positions = options.positions;
        }

    }

    PolylinePrimitive.prototype = new ChangeablePrimitive();

    PolylinePrimitive.prototype.getType = function() {
        return DrawingTypes.DRAWING_POLYLINE;
    };
    PolylinePrimitive.prototype.setPositions = function(positions) {
        this.setAttribute('positions', positions);
    };
    PolylinePrimitive.prototype.setWidth = function(width) {
        this.setAttribute('width', width);
    };
    PolylinePrimitive.prototype.setGeodesic = function(geodesic) {
        this.setAttribute('geodesic', geodesic);
    };
    PolylinePrimitive.prototype.getPositions = function() {
        return this.getAttribute('positions');
    };
    PolylinePrimitive.prototype.getWidth = function() {
        return this.getAttribute('width');
    };
    PolylinePrimitive.prototype.getGeodesic = function() {
        return this.getAttribute('geodesic');
    };
    PolylinePrimitive.prototype.getGeometry = function() {
        if (!defined(this.positions) || this.positions.length < 2) {
            return;
        }

        return new PolylineGeometry({
            positions : this.positions,
            height : this.height,
            loop : this.loop || false,
            width : this.width < 1 ? 1 : this.width,
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            ellipsoid : this.ellipsoid
        });
        // return new GroundPolylineGeometry({
        //     positions : this.positions,
        //     height : this.height,
        //     width : this.width < 1 ? 1 : this.width,
        //     vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        //     ellipsoid : this.ellipsoid
        // })

    };

    PolylinePrimitive.prototype.applyPerInstanceColor = function() {
        this.appearance = new PolylineColorAppearance();
    };

    PolylinePrimitive.prototype.applyColorMaterial = function() {
        this.appearance = new PolylineMaterialAppearance({
            material : Material.fromType('Color', {
                color : new Color(0.7, 0.0, 1.0, 1.0)
            })
        });
    };

    PolylinePrimitive.prototype.applyGlowMaterial = function() {
        this.appearance = new PolylineMaterialAppearance({
            material : Material.fromType('PolylineGlow', {
                innerWidth : 1.0
            })
        });
    };

    // PolylinePrimitive.prototype.applyArrow = function() {
    //     this.appearance = PolylineMaterialAppearance({
    //         material : Material.fromType('PolylineArrow')
    //     });
    // };
    //
    // PolylinePrimitive.prototype.applyDash = function() {
    //     this.appearance = PolylineMaterialAppearance({
    //         material : Material.fromType('PolylineDash', {
    //             color : Color.YELLOW
    //         })
    //     });
    // };
    //
    // PolylinePrimitive.prototype.applyOutline = function() {
    //     this.appearance = PolylineMaterialAppearance({
    //         material : Material.fromType('PolylineOutline')
    //     });
    // };

    PolylinePrimitive.prototype.toLonLats = function(result) {
        var cartographicArray = this.ellipsoid.cartesianArrayToCartographicArray(this.positions);
        var length = cartographicArray.length;
        if (defined(result)) {
            result.length = length;
        } else {
            result = new Array(length);
        }
        for (var n = 0; n < length; ++n) {
            result[n] = [Math.toDegrees(cartographicArray[n].longitude), Math.toDegrees(cartographicArray[n].latitude)];
        }
        return result;
    };

    PolylinePrimitive.fromDegrees = function(coordinate, options) {
        options = defaultValue(options, {});
        options.coordinates = coordinate;
        options.asynchronous = false;
        return new PolylinePrimitive(options, false);
    };

    PolylinePrimitive.prototype.setEditable = function(editMode) {
        editMode = defaultValue(editMode, true);
        this._editable = editMode;
        var self = this;
        self.isPolygon = false;
        self.asynchronous = false;
        if (defined(this.owner)) {
            var drawingManager = this.owner;
            if (editMode) {
                drawingManager.registerEditableShape(self);
                var width = this.width;
                self.setHighlighted = function(highlighted) {
                    if (true !== this._editMode) {
                        if (highlighted) {
                            drawingManager.setHighlighted(this);
                            this.setWidth(2 * width);
                        } else {
                            this.setWidth(width);
                        }
                    }
                };
                self.getExtent = function() {
                    return Extent.fromCartographicArray(this.ellipsoid.cartesianArrayToCartographicArray(this.positions));
                };
                self.setEditMode(false);
            } else {
                drawingManager.unregisterEditableShape(self);
            }
        }
    };

    PolylinePrimitive.prototype.setEditMode = function(editMode) {
        var drawingManager = this.owner;
        var self = this;
        var ellipsoid = this.ellipsoid;
        if (this._editMode !== editMode) {
            drawingManager.disableAllHighlights();
            dragBillboard.primitive = self;
            dragHalfBillboard.primitive = self;
            if (editMode) {
                drawingManager.setEdited(this);
                var scene = drawingManager._scene;
                if (null === this._markers) {
                    var dragBillboardGroup = new BillboardGroup(drawingManager, dragBillboard);
                    var dragHalfBillboardGroup = new BillboardGroup(drawingManager, dragHalfBillboard);
                    var handleMarkerChanges = {
                        dragHandlers : {
                            onDrag : function(index, position) {
                                self.positions[index] = position;
                                scene.refreshAlways = true;
                                updateBillboardPosition(dragHalfBillboardGroup, index, self.positions);
                                self._createPrimitive = true;
                            },
                            onDragEnd : function(index, position) {
                                self._createPrimitive = true;
                                onEdited();
                                scene.refreshAlways = false;
                            }
                        },
                        onDoubleClick : function(e) {
                            if( self.positions.length >= 4){
                                self.positions.splice(e, 1);
                                self._createPrimitive = true;
                                dragBillboardGroup.removeBillboard(e);
                                dragHalfBillboardGroup.removeBillboard(e);
                                updateBillboardPosition(dragHalfBillboardGroup, e, self.positions);
                                onEdited();
                            }
                        },
                        tooltip : function() {
                            if (self.positions.length > 3) {
                                return '拖动移位，双击删除';
                            }
                        }
                    };
                    dragBillboardGroup.addBillboards(self.positions, handleMarkerChanges);
                    this._markers = dragBillboardGroup;
                    var positions = [];
                    var length = self.positions.length + (this.isPolygon ? 0 : -1);
                    for (var i = 0; i < length; i++) {
                        positions.push(getPosition(i));
                    }
                    var callbacks = {
                        dragHandlers : {
                            onDragStart : function(index, position) {
                                scene.refreshAlways = true;
                                this.index = index + 1;
                                self.positions.splice(this.index, 0, position);
                                self._createPrimitive = true;
                            },
                            onDrag : function(index, position) {
                                self.positions[this.index] = position;
                                self._createPrimitive = true;
                            },
                            onDragEnd : function(index, position) {
                                dragBillboardGroup.insertBillboard(this.index, position, handleMarkerChanges);
                                dragHalfBillboardGroup.getBillboard(this.index - 1).position = getPosition(this.index - 1);
                                dragHalfBillboardGroup.insertBillboard(this.index, getPosition(this.index), callbacks);
                                self._createPrimitive = true;
                                onEdited();
                                scene.refreshAlways = false;
                            }
                        },
                        tooltip : function() {
                            return '拖动创建新点';
                        }
                    };
                    dragHalfBillboardGroup.addBillboards(positions, callbacks);
                    this._editMarkers = dragHalfBillboardGroup;
                    this._globeClickhandler = new ScreenSpaceEventHandler(scene.canvas);
                    this._globeClickhandler.setInputAction(function(movement) {
                        var pickedObject = scene.pick(movement.position);
                        if (!(pickedObject && pickedObject.primitive)) {
                            self.setEditMode(false);
                        }
                    }, ScreenSpaceEventType.LEFT_CLICK);
                    dragBillboardGroup.setOnTop();
                    dragHalfBillboardGroup.setOnTop();
                }
                this._editMode = true;
            } else {
                if (null !== this._markers) {
                    this._markers.remove();
                    if (defined(this._editMarkers)) {
                        this._editMarkers.remove();
                    }
                    this._markers = null;
                    this._editMarkers = undefined;
                    this._globeClickhandler.destroy();
                }
                this._editMode = false;
            }
        }

        function getPosition(index) {
            var positions = self.positions;
            var cartographic = ellipsoid.cartesianToCartographic(positions[index]);
            var cartesian = ellipsoid.cartesianToCartographic(positions[index < positions.length - 1 ? index + 1 : 0]);
            var geodesic = new EllipsoidGeodesic(cartographic, cartesian).interpolateUsingFraction(0.5);
            if (self.heightReference !== HeightReference.CLAMP_TO_GROUND && defined(self.height)) {
                geodesic.height = self.height;
            } else {
                geodesic.height = (cartographic.height + cartesian.height) / 2;
            }
            return ellipsoid.cartographicToCartesian(geodesic);
        }

        function updateBillboardPosition(billboardGroup, index, positions) {
            var n = index - 1 < 0 ? positions.length - 1 : index - 1;
            if (n < billboardGroup.countBillboards()) {
                billboardGroup.getBillboard(n).position = getPosition(n);
            }

            //  (n = t) < e.countBillboards() && (e.getBillboard(n).position = r(n))
        }

        function onEdited() {
            drawingManager._dispatchOverlayEdited(self, {
                name : 'onEdited',
                positions : self.positions
            });
        }

    };

    return PolylinePrimitive;
});
