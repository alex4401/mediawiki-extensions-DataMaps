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

    function getMarkerPopupContents(markerType, group, markerInfo) {
        var title = group.name;
        if (markerInfo.label) {
            title += ": " + markerInfo.label;
        }
        var out = "<b>"+title+"</b>";
        if (markerInfo.description) {
            out += markerInfo.description;
        }
        out += "<p>lat "+markerInfo.lat+", lon "+markerInfo.long+"</p>";
        return out;
    }

    function loadMarkersChunk(ctx, data) {
        for (var markerType in data.markers) {
            var groupName = markerType.split(' ', 1)[0];
            var group = ctx.config.groups[groupName];
            var placements = data.markers[markerType];

            if (!ctx.leafletLayers[markerType]) {
                ctx.leafletLayers[markerType] = L.featureGroup().addTo(ctx.leaflet);
            }
            var layer = ctx.leafletLayers[markerType];

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
                    .bindPopup(getMarkerPopupContents(markerType, group, markerInfo));
            });

        }
    }

    function setLayerVisibility(ctx, targetName, newState) {
        for (var layerName in ctx.leafletLayers) {
            if (layerName.split(' ').indexOf(targetName) >= 0) {
                if (newState) {
                    ctx.leafletLayers[layerName].addTo(ctx.leaflet);
                } else {
                    ctx.leafletLayers[layerName].remove();
                }
            }
        }
    }

    function buildLegend(ctx) {
        ctx.$legendRoot = ctx.$root.find('.datamap-legend');

        for (var groupName in ctx.config.groups) {
            var group = ctx.config.groups[groupName];

            var checkbox = new OO.ui.CheckboxInputWidget({
                selected: true
            });
            var field = new OO.ui.FieldLayout(checkbox, {
                label: group.name,
                align: 'inline'
            });

            checkbox.on('change', (function(groupName, checkbox) {
                setLayerVisibility(ctx, groupName, checkbox.isSelected());
            }).bind(null, groupName, checkbox));

            if (group.legendIcon) {
                field.$header.prepend(' ');
                field.$header.prepend($('<img width=24 height=24/>').attr('src', group.legendIcon));
                
                field.$header.prepend($('<div class="datamap-legend-circle-placeholder">').css({
                    width: group.size+4,
                    height: group.size+4,
                    backgroundColor: group.fillColor,
                    borderColor: group.strokeColor || group.fillColor,
                    borderWidth: group.strokeWidth || 1,
                }));
            }

            field.$element.appendTo(ctx.$legendRoot);
        }
    }

    function buildLeafletMap(ctx, $holder) {
        ctx.leaflet = L.map($holder.get(0), {
            crs: L.CRS.Simple,
            // Renderer - using canvas for performance with padding of 1/3rd (to draw some more markers outside of view for panning UX)
            preferCanvas: true,
            renderer: L.canvas({
                padding: 1/3,
            }),
            // Boundaries
            center: [50, 50],
            maxBounds: [[-75,-75], [175, 175]],
            maxBoundsViscosity: 0.2,
            // Zoom settings
            zoomSnap: 0.25,
            zoomDelta: 0.25,
            minZoom: 2.75,
            maxZoom: 5,
            zoom: 2.75,
            zoomAnimation: false,
            wheelPxPerZoomLevel: 240,
            markerZoomAnimation: false
        }).fitBounds([[0, 0], [100, 100]]);
        ctx.background = L.imageOverlay(ctx.config.image, [[0,0],[100,100]]).addTo(ctx.leaflet);

        ctx.leaflet.on('zoomend', function() {
            for (var groupName in ctx.config.groups) {
                var group = ctx.config.groups[groupName];
                // Configured marker size is the diameter of a marker at lowest zoom level.
                group.circleMarkers.forEach(function(marker) {
                    marker.setRadius(getCircleRadiusAtCurrentZoom(ctx, group.size));
                });
            }
        });

        for (var groupName in ctx.config.groups) {
            var group = ctx.config.groups[groupName];
            group.circleMarkers = [];

            if (group.markerIcon) {
                ctx.leafletIcons[groupName] = L.icon({ iconUrl: group.markerIcon, iconSize: [32, 32] });
            }
        }
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
        }).then(function() {
            $container.find('.datamap-status').remove();
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