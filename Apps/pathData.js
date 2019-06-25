  var czml = [{
            "id": "document",
            "name": "polygon",
            "version": "1.0",
            "clock": {
                "interval": "2012-08-04T16:00:00Z/2012-08-04T18:00:00Z",
                "currentTime": "2012-08-04T16:00:00Z",
                "multiplier": 10
            }
        }, {
            "id": "shape2",
            "name": "Red box with black outline",
            "availability": "2012-08-04T16:00:00Z/2012-08-04T18:00:00Z",

            "model": {
                "gltf": "./SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
                "minimumPixelSize": 100,
                "maximumScale": 50
            },
            "path": {
                "material": {
                    "solidColor": {
                        "color": {
                            "interval": "2012-08-04T16:00:00Z/2012-08-04T18:00:00Z",
                            "rgba": [255, 0, 0, 128]
                        }
                    }
                },
                "width": [{
                    "interval": "2012-08-04T16:00:00Z/2012-08-04T18:00:00Z",
                    "number": 3.0
                }],
                "show": [{
                    "interval": "2012-08-04T16:00:00Z/2012-08-04T18:00:00Z",
                    "boolean": true
                }]
            },
            "position": {
                "interpolationAlgorithm": "LAGRANGE",
                "interpolationDegree": 1,
                "epoch": "2012-08-04T16:00:00Z",
                "cartographicDegrees": [
                    0.0, 121.5301772615, 31.0840587516, 0.0,
                    30.0, 121.5307252615, 31.0842907516, 0.0
                ]
            }
        }];
