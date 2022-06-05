(function($, mw) {
    var mapConfigs = mw.config.get('dataMaps');

    function loadMapData(pageName, version) {
        var url = mw.util.getUrl(pageName, {
            action: 'raw',
            ctype: 'application/json',
            version: version,
        });
        return fetch(url).then(function (response) {
            return response.json();
        });
    }

    function getCircleRadiusAtCurrentZoom(ctx, baseSize) {
        // Configured marker size is the diameter of a marker at lowest zoom level.
        var scale = ctx.leaflet.getZoom() / ctx.leaflet.options.minZoom;
        return scale * baseSize/2;
    }

    function loadMarkersChunk(ctx, data) {
        for (var markerType in data.markers) {
            var groupName = markerType.split(' ', 1)[0];
            var group = ctx.config.groups[groupName];
            var placements = data.markers[markerType];

            var layer = L.featureGroup().addTo(ctx.leaflet);
            ctx.leafletLayers[markerType] = layer;

            placements.forEach(function(markerInfo) {
                var position = [100-markerInfo.lat, markerInfo.long];
                var marker;
                
                if (group.markerIcon) {
                    marker = L.marker(position, {
                        icon: ctx.leafletIcons[groupName]
                    });
                } else {
                    marker = L.circleMarker(position, {
                        radius: getCircleRadiusAtCurrentZoom(ctx, group.size),
                        fillColor: group.fillColor,
                        fillOpacity: 0.7,
                        color: group.strokeColor || group.fillColor,
                        weight: group.strokeWidth || 1,
                    });
                    group.circleMarkers.push(marker);
                }

                marker
                    .addTo(layer)
                    .bindPopup("<b>"+group.name+"</b><p>lat "+markerInfo.lat+", lon "+markerInfo.long+"</p>");
            });

        }
    }

    function buildLegend(ctx) {
        ctx.$legendRoot = ctx.$root.find('.datamap-legend');

        for (var groupName in ctx.config.groups) {
            var group = ctx.config.groups[groupName];

            var checkbox = new OO.ui.CheckboxInputWidget({
                selected: true
            });
            new OO.ui.FieldLayout(checkbox, {
                label: group.name,
                align: 'inline'
            }).$element.appendTo(ctx.$legendRoot);
        }
    }

    function buildLeafletMap(ctx, $holder) {
        ctx.leaflet = L.map($holder.get(0), {
            crs: L.CRS.Simple,
            center: [50, 50],
            zoomSnap: 0.25,
            zoomDelta: 0.25,
            minZoom: 2.5,
            maxZoom: 5,
            zoom: 2.75,
            maxBounds: [[-75,-75], [175, 175]],
            zoomAnimation: false,
            maxBoundsViscosity: 0.2,
            wheelPxPerZoomLevel: 240,
            preferCanvas: true,
            worldCopyJump: true,
            markerZoomAnimation: false
        }).fitBounds([[0, 0], [100, 100]]);
        ctx.background = L.imageOverlay(config.image, [[0,0],[100,100]]).addTo(ctx.leaflet);

        for (var groupName in ctx.config.groups) {
            var group = ctx.config.groups[groupName];
            group.circleMarkers = [];

            if (group.markerIcon) {
                ctx.leafletIcons[groupName] = L.icon({ iconUrl: group.markerIcon, iconSize: [32, 32] });
            }
        }

        ctx.leaflet.on('zoomend', function() {
            for (var groupName in config.groups) {
                var group = config.groups[groupName];
                // Configured marker size is the diameter of a marker at lowest zoom level.
                group.circleMarkers.forEach(function(marker) {
                    marker.setRadius(getCircleRadiusAtCurrentZoom(ctx, group.size));
                });
            }
        });
    }

    function initialiseMap($container, config) {
        if ($container.data('initialised')) {
            return;
        }
        $container.data('initialised', 'true');

        var ctx = {
            $root: $container,
            config: config,
            coordSpace: config.coordinateBounds,

            leaflet: null,
            leafletIcons: {},
            leafletLayers: {},
        };

        mw.loader.using('oojs-ui-core', buildLegend.bind(null, ctx));
        buildLeafletMap(ctx, $container.find('.datamap-holder'));

        loadMapData(config.pageName, config.version).then(function(data) {
            loadMarkersChunk(ctx, data);
        });

        return ctx;
    }

    function onPageContent($content) {
        for (var id in mapConfigs) {
            var map = initialiseMap($content.find('.datamap-container#datamap-' + id), mapConfigs[id]);
            mw.hook( 'ext.ark.datamaps.onMapInitialised' ).fire( map );
        }
    }

	mw.hook('wikipage.content').add(onPageContent);
})(window.jQuery, window.mediaWiki);