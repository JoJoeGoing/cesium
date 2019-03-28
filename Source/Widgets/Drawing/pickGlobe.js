define(['../../Core/defined',
    '../../Core/DeveloperError',
    '../../Core/Ray',
    '../../Core/Cartesian3',
    '../../Core/BoundingSphere',
    '../../Core/IntersectionTests',
    '../../Core/Ellipsoid',
    '../../Core/Cartographic'
], function(defined, DeveloperError, Ray, Cartesian3, BoundingSphere, IntersectionTests,
            Ellipsoid) {
    'use strict';

    var ellipsoid = new Ellipsoid();

    /**
     *
     * @param CesiumScene
     * @param windowPosition
     * @param aboveHeight 最终高度
     * @returns {*}
     */
    function pickGlobe(CesiumScene, windowPosition, aboveHeight) {
        if(!defined(CesiumScene)){
            return;
        }
        var globe = CesiumScene.globe;
        var camera = CesiumScene.camera;
        var ray = camera.getPickRay(windowPosition);

        if(aboveHeight > 0){
            var cartesian3 = Cartesian3.fromElements(6378137 + aboveHeight, 6378137 + aboveHeight, 6356752.314245179 + aboveHeight);
            var newEllipsoid = Ellipsoid.fromCartesian3(cartesian3, ellipsoid);
            //得到射线和椭球的第一个交点。
            var intersection = IntersectionTests.rayEllipsoid(ray, newEllipsoid);
            if (defined(intersection)) {
                return Ray.getPoint(ray, intersection.start, new Cartesian3());
            }
        }
        if (defined(ray)) {
            return globe.pick(ray,CesiumScene);
        }
        return camera.pickEllipsoid(windowPosition);
    }

    return pickGlobe;
});
