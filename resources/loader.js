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
                        radius: markerInfo.size/2,
                        fillColor: markerInfo.fillColor,
                        color: markerInfo.strokeColor,
                        weight: markerInfo.strokeWidth,
                    });
                }

                marker
                    .addTo(layer)
                    .bindPopup("<b>"+group.name+"</b><p>lat "+markerInfo.lat+", lon "+markerInfo.long+"</p>");
            });

        }
    }

    function initialiseMap($map, config) {
        if ($map.data('initialised')) {
            return;
        }
        $map.data('initialised', true);

        var ctx = {
            config: config,
            coordSpace: config.coordinateBounds,

            leaflet: L.map($map.get(0), {
                crs: L.CRS.Simple,
                center: [50, 50],
                zoomSnap: 0.25,
                zoomDelta: 0.25,
                minZoom: 2.5,
                maxZoom: 9,
                zoom: 2.75,
                maxBounds: [[-75,-75], [175, 175]],
                zoomAnimation: false,
                maxBoundsViscosity: 0.2,
                wheelPxPerZoomLevel: 240,
                prefersCanvas: true
            }).fitBounds([[0, 0], [100, 100]]),

            leafletIcons: {},
            leafletLayers: {},
        };
        ctx.background = L.imageOverlay(config.image, [[0,0],[100,100]]).addTo(ctx.leaflet);

        for (var groupName in config.groups) {
            var group = config.groups[groupName];
            if (group.markerIcon) {
                ctx.leafletIcons[groupName] = L.icon({ iconUrl: group.markerIcon, iconSize: [32, 32] });
            }
        }

        loadMapData(config.pageName, config.version).then(function(data) {
            loadMarkersChunk(ctx, data);
        });

        return ctx;
    }

    function onPageContent($content) {
        for (var id in mapConfigs) {
            var map = initialiseMap($content.find('.datamap#datamap-' + id), mapConfigs[id]);
            mw.hook( 'ext.ark.datamaps.onMapInitialised' ).fire( map );
        }
    }

	mw.hook('wikipage.content').add(onPageContent);
})(window.jQuery, window.mediaWiki);