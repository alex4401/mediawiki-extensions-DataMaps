(function($, mw) {
    var mapConfigs = mw.config.get('dataMaps');
    var api = new mw.Api();


    /*
     * Returns circle radius adjusted for zoom level
    */
    function getCircleRadiusAtCurrentZoom(ctx, baseSize) {
        // Configured marker size is the diameter of a marker at lowest zoom level
        var scale = ctx.leaflet.getZoom() / ctx.leaflet.options.minZoom;
        return scale * baseSize/2;
    }


    /*
     * Builds popup contents for a marker instance
    */
    function buildMarkerPopup(type, group, instance) {
        var parts = [];

        // Build the title
        var title = group.name;
        if (instance.label) {
            title += ": " + instance.label;
        }
        parts.push('<b class="datamap-popup-title">' + title + '</b>');

        // Coordinates
        parts.push('<div class="datamap-popup-coordinates">lat '+instance.lat+', lon '+instance.long+'</div>');

        // Description
        if (instance.description) {
            if (!instance.description.startsWith('<p>')) {
                instance.description = '<p>'+instance.description+'</p>';
            }
            parts.push(instance.description);
        }

        // Image
        if (instance.image) {
            parts.push('<img class="datamap-popup-image" width=240 src="'+instance.image+'" />');
        }

        // Related article
        if (instance.article) {
            parts.push('<div class="datamap-popup-seemore"><a href="' + mw.util.getUrl(instance.article) + '">'
                        + mw.msg('datamap-popup-related-article') + '</a></div>');
        }


        return parts.join('\n');
    }


    /*
     * Builds markers from a data object
    */
    function loadMarkersChunk(ctx, data) {
        for (var markerType in data.markers) {
            var groupName = markerType.split(' ', 1)[0];
            var group = ctx.config.groups[groupName];
            var placements = data.markers[markerType];

            // Initialise the Leaflet layer group if it hasn't been already
            if (!ctx.leafletLayers[markerType]) {
                ctx.leafletLayers[markerType] = L.featureGroup().addTo(ctx.leaflet);
            }
            // Retrieve the Leaflet layer
            var layer = ctx.leafletLayers[markerType];

            // Create markers for instances
            placements.forEach(function(markerInfo) {
                var position = [100-markerInfo.lat, markerInfo.long];
                var marker;
                
                if (group.markerIcon) {
                    // Fancy icon marker
                    marker = L.marker(position, {
                        icon: ctx.leafletIcons[groupName]
                    });
                } else {
                    // Circular marker
                    marker = L.circleMarker(position, {
                        radius: getCircleRadiusAtCurrentZoom(ctx, group.size),
                        fillColor: group.fillColor,
                        fillOpacity: 0.7,
                        color: group.strokeColor || group.fillColor,
                        weight: group.strokeWidth || 1,
                    });
                    group.circleMarkers.push(marker);
                }

                // Add to the layer and bind a popup
                marker
                    .addTo(layer)
                    .bindPopup(buildMarkerPopup(markerType, group, markerInfo));
            });

        }
    }


    function updateLayerVisibility(ctx, matcher, newState) {
        for (var layerName in ctx.leafletLayers) {
            if (matcher(layerName.split(' '))) {
                if (newState) {
                    ctx.leafletLayers[layerName].addTo(ctx.leaflet);
                } else {
                    ctx.leafletLayers[layerName].remove();
                }
            }
        }
    }


    function isLayerUsed(ctx, name) {
        return ctx.config.layerIds.indexOf(name) >= 0;
    }


    function buildLegend(ctx) {
        ctx.$legendRoot = ctx.$root.find('.datamap-container-legend');

        var buttonGroup = new OO.ui.ButtonGroupWidget({ });
        buttonGroup.$element.appendTo(ctx.$legendRoot);

        // Toggle all layers
        {
            var showAllButton = new OO.ui.ButtonWidget( {
                label: mw.msg('datamap-toggle-show-all')
            });
            showAllButton.on('click', function() {
                ctx.legendGroupToggles.forEach(function(checkbox) {
                    checkbox.setSelected(true);
                });
            });
            buttonGroup.addItems([ showAllButton ]);
        }

        // Hide all layers
        {
            var hideAllButton = new OO.ui.ButtonWidget( {
                label: mw.msg('datamap-toggle-hide-all')
            });
            hideAllButton.on('click', function() {
                ctx.legendGroupToggles.forEach(function(checkbox) {
                    checkbox.setSelected(false);
                });
            });
            buttonGroup.addItems([ hideAllButton ]);
        }

        // Cave layer toggle
        // TODO: rework into a generic layer system
        if (isLayerUsed(ctx, 'cave')) {
            var caveToggleButton = new OO.ui.ToggleButtonWidget( {
                label: mw.msg('datamap-toggle-caves'),
                value: true
            });
            caveToggleButton.on('click', function() {
                var newState = caveToggleButton.getValue();
                // Update visibility mask for caves
                ctx.layerVisibilityMask.cave = newState;
                // Update visibility for any marker of an unhidden group with `cave` layer
                updateLayerVisibility(ctx, function(layerNames) {
                    return layerNames.indexOf('cave') >= 0 && ctx.groupVisibilityMask[layerNames[0]];
                }, newState);
            });
            buttonGroup.addItems([ caveToggleButton ]);
        }

        // Individual group toggles
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
                var newState = checkbox.isSelected();
                // Update visibility mask for this group
                ctx.groupVisibilityMask[groupName] = newState;
                // Update visibility for any marker of this group with any visible layer
                updateLayerVisibility(ctx, function(layerNames) {
                    return layerNames[0] == groupName
                        && layerNames.filter(function(x) {
                            return ctx.layerVisibilityMask[x] === false;
                        }).length == 0;
                }, newState);
            }).bind(null, groupName, checkbox));

            if (group.fillColor) {
                field.$header.prepend($('<div class="datamap-legend-circle">').css({
                    width: group.size+4,
                    height: group.size+4,
                    backgroundColor: group.fillColor,
                    borderColor: group.strokeColor || group.fillColor,
                    borderWidth: group.strokeWidth || 1,
                }));
            }

            if (group.legendIcon) {
                field.$header.prepend($('<img width=24 height=24/>').attr('src', group.legendIcon));
            }

            field.$element.appendTo(ctx.$legendRoot);
            ctx.legendGroupToggles.push(checkbox);
        }
    }


    function buildLeafletMap(ctx, $holder) {
        var rendererSettings = {
            padding: 1/3
        };
        var leafletConfig = {
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
            markerZoomAnimation: false,
            // Pan settings
            inertia: false
        };
        leafletConfig = $.extend(leafletConfig, ctx.config.leafletSettings);
        rendererSettings = $.extend(rendererSettings, leafletConfig.rendererSettings);
        leafletConfig = $.extend(leafletConfig, {
            crs: L.CRS.Simple,
            // Renderer - using canvas for performance with padding of 1/3rd (to draw some more markers outside of view for panning UX)
            preferCanvas: true,
            renderer: L.canvas(rendererSettings)
        });

        ctx.leaflet = L.map($holder.get(0), leafletConfig).fitBounds([[0, 0], [100, 100]]);
        ctx.background = L.imageOverlay(ctx.config.image, [[0,0],[100,100]]).addTo(ctx.leaflet);

        ctx.leaflet.on('zoomend', function() {
            for (var groupName in ctx.config.groups) {
                var group = ctx.config.groups[groupName];
                // Configured marker size is the diameter of a marker at lowest zoom level
                group.circleMarkers.forEach(function(marker) {
                    marker.setRadius(getCircleRadiusAtCurrentZoom(ctx, group.size));
                });
            }
        });

        for (var groupName in ctx.config.groups) {
            var group = ctx.config.groups[groupName];
            group.circleMarkers = [];

            // Set as visible in the visibility mask
            ctx.groupVisibilityMask[groupName] = true;

            if (group.markerIcon) {
                // Prepare the icon objects for Leaflet markers
                ctx.leafletIcons[groupName] = L.icon({ iconUrl: group.markerIcon, iconSize: [32, 32] });
            }
        }

        // Create a coordinate-under-cursor display
        ctx.$coordTracker = $('<div class="leaflet-control datamap-control-coords">')
                            .appendTo(ctx.$root.find('.leaflet-control-container .leaflet-bottom.leaflet-left'));
        ctx.coordTrackingMsg = mw.msg('datamap-coordinate-control-text');
        ctx.leaflet.on('mousemove', function(event) {
            var lat = event.latlng.lat;
            var lon = event.latlng.lng;
            if (lat >= -5 && lat <= 105 && lon >= -5 && lon <= 105) {
                lat = 100 - lat;
                ctx.$coordTracker.text(ctx.coordTrackingMsg
                                       .replace('$1', lat.toFixed(2))
                                       .replace('$2', lon.toFixed(2)));
            }
        });
    }


    function initialiseMap($container, config) {
        // Do not run this method further if map has been already marked as initialised
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

            $coordTracker: null,

            legendGroupToggles: [],
            groupVisibilityMask: {},
            layerVisibilityMask: {
                cave: true
            },
        };

        // Request OOUI to be loaded and build the legend
        mw.loader.using([ 'oojs-ui-core', 'oojs-ui-widgets' ], buildLegend.bind(null, ctx));
        // Prepare the Leaflet map view
        buildLeafletMap(ctx, $container.find('.datamap-holder'));

        // Request markers from the API
        api.get({
            action: 'queryDataMap',
            title: config.pageName,
            revid: config.version
        }).then(function(data) {
            loadMarkersChunk(ctx, data.query);
        }).then(function() {
            $container.find('.datamap-status').remove();
        });

        return ctx;
    }


    function onPageContent($content) {
        // Run initialisation for every map, followed by an `onMapInitialised` event for gadgets to listen to
        for (var id in mapConfigs) {
            mw.hook( 'ext.ark.datamaps.beforeMapInitialisation' ).fire( mapConfigs[id] );
            var map = initialiseMap($content.find('.datamap-container#datamap-' + id), mapConfigs[id]);
            mw.hook( 'ext.ark.datamaps.afterMapInitialisation' ).fire( map );
        }
    }


    // Begin initialisation once the document is loaded
	mw.hook('wikipage.content').add(onPageContent);
})(window.jQuery, window.mediaWiki);