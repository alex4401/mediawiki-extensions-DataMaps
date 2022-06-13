var mapConfigs = mw.config.get( 'dataMaps' );
var api = new mw.Api();


function initialiseMap( $container, config ) {
    var self = {
        // Root DOM element of the data map
        $root: $container,
        // Setup configuration
        config: config,
        // Coordinate space (currently unused)
        coordSpace: config.coordinateBounds,

        background: null,

        // Leaflet's Map instance
        leaflet: null,
        // Group to Leaflet's Icon instance map
        leafletIcons: {},
        // Layer to Leaflet's FeatureGroup map
        leafletLayers: {},

        // DOM element for the coordinates display control
        $coordTracker: null,

        legendTabLayout: null,

        legendGroupToggles: [],
        groupVisibilityMask: {},
        layerVisibilityMask: {
            cave: true
        },
    };


    self.waitForLeaflet = function ( callback ) {
        if ( self.leaflet == null ) {
            setTimeout( self.waitForLeaflet.bind( null, callback ), 25 );
        } else {
            callback();
        }
    };

    
    self.isLayerUsed = function ( name ) {
        return config.layerIds.indexOf(name) >= 0;
    };


    self.updateLayerVisibility = function ( matcher, newState ) {
        for ( var layerName in self.leafletLayers ) {
            if ( matcher( layerName.split( ' ' ) ) ) {
                if ( newState ) {
                    self.leafletLayers[layerName].addTo( self.leaflet );
                } else {
                    self.leafletLayers[layerName].remove();
                }
            }
        }
    };


    /*
     * Returns scale factor to adjust markers for zoom level
    */
    self.getScaleFactorByZoom = function ( a ) {
        return self.leaflet.getZoom() / self.leaflet.options[ a + 'Zoom' ];
    };


    /*
     * Builds popup contents for a marker instance
    */
    self.buildPopup = function ( type, group, instance ) {
        var parts = [];
        var slots = instance[2] || {};
    
        // Build the title
        var title = group.name;
        if ( slots.label ) {
            title += ": " + slots.label;
        }
        parts.push( '<b class="datamap-popup-title">' + title + '</b>' );
    
        // Coordinates
        parts.push( '<div class="datamap-popup-coordinates">lat '+instance[0]+', lon '+instance[1]+'</div>' );
    
        // Description
        if ( slots.desc ) {
            if ( !slots.desc.startsWith( '<p>' ) ) {
                slots.desc = '<p>'+slots.desc+'</p>';
            }
            parts.push( slots.desc );
        }
    
        // Image
        if ( slots.image ) {
            parts.push( '<img class="datamap-popup-image" width=240 src="'+slots.image+'" />' );
        }
    
        // Related article
        if ( slots.article ) {
            parts.push( '<div class="datamap-popup-seemore"><a href="' + mw.util.getUrl( slots.article ) + '">'
                        + mw.msg( 'datamap-popup-related-article' ) + '</a></div>' );
        }
    
    
        return parts.join('\n');
    };


    /*
     * Builds markers from a data object
    */
    self.instantiateMarkers = function ( data ) {
        for (var markerType in data) {
            var groupName = markerType.split(' ', 1)[0];
            var group = self.config.groups[groupName];
            var placements = data[markerType];

            // Initialise the Leaflet layer group if it hasn't been already
            if (!self.leafletLayers[markerType]) {
                self.leafletLayers[markerType] = L.featureGroup().addTo(self.leaflet);
            }
            // Retrieve the Leaflet layer
            var layer = self.leafletLayers[markerType];

            // Create markers for instances
            placements.forEach( function( instance) {
                var position = [100-instance[0], instance[1]];
                var marker;

                // Construct the marker
                if (group.markerIcon) {
                    // Fancy icon marker
                    marker = L.marker(position, {
                        icon: self.leafletIcons[groupName]
                    });
                } else {
                    // Circular marker
                    marker = L.circleMarker(position, {
                        radius: self.getScaleFactorByZoom( 'min' ) * group.size/2,
                        fillColor: group.fillColor,
                        fillOpacity: 0.7,
                        color: group.strokeColor || group.fillColor,
                        weight: group.strokeWidth || 1,
                    });
                }
                group.markers.push(marker);

                // Add to the layer and bind a popup
                marker
                    .addTo(layer)
                    .bindPopup(self.buildPopup(markerType, group, instance));
            } );
        }
    };


    /*
     * 
    */
    self.setCurrentBackground = function ( index ) {
        if ( self.background ) {
            self.background.overlay.remove();
        }

        self.background = self.config.backgrounds[ index ];
        self.background.overlay.addTo( self.leaflet );
    };


    /*
     * Builds popup contents for a marker instance
    */
    self.addLegendTab = function ( name ) {
        var result = new OO.ui.TabPanelLayout( {
            name: name,
            label: name,
            expanded: false
        } );
        self.legendTabLayout.addTabPanels( [ result ] );
        return result;
    };


    self.recalculateMarkerSizes = function () {
        var scaleMin = self.getScaleFactorByZoom( 'min' ),
            scaleMax = self.getScaleFactorByZoom( 'max' );
        for ( var groupName in self.config.groups ) {
            var group = self.config.groups[groupName];

            if ( group.fillColor ) {
                // Circle: configured marker size is the size of a marker at lowest zoom level
                group.markers.forEach( function( marker ) {
                    marker.setRadius( scaleMin * group.size/2 );
                } );
            } else if ( group.markerIcon ) {
                // Icon: configured marker size is the size of a marker at the highest zoom level
                self.leafletIcons[groupName].options.iconSize = [ group.size[0] * scaleMax, group.size[1] * scaleMax ];
                // Update all existing markers to use the altered icon instance
                group.markers.forEach( function( marker ) {
                    marker.setIcon( self.leafletIcons[groupName] );
                } );
            }
        }
    };


    var buildLeafletMap = function ( $holder ) {
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
        leafletConfig = $.extend( leafletConfig, self.config.leafletSettings );
        rendererSettings = $.extend( rendererSettings, leafletConfig.rendererSettings );
        leafletConfig = $.extend( leafletConfig, {
            crs: L.CRS.Simple,
            // Renderer - using canvas for performance with padding of 1/3rd (to draw some more markers outside of view for panning UX)
            preferCanvas: true,
            renderer: L.canvas( rendererSettings )
        } );
    
        self.leaflet = L.map( $holder.get( 0 ), leafletConfig ).fitBounds( [ [0, 0], [100, 100] ] );

        // Prepare image overlays for all backgrounds and switch to the first defined one
        self.config.backgrounds.forEach( function ( background ) {
            background.overlay = L.imageOverlay( background.image, ( background.at || [ [0, 0], [100, 100] ] ) );
        } );
        self.setCurrentBackground( 0 );
    
        self.leaflet.on( 'zoomend', self.recalculateMarkerSizes );
    
        for ( var groupName in self.config.groups ) {
            var group = self.config.groups[groupName];
            group.markers = [];
    
            // Set as visible in the visibility mask
            self.groupVisibilityMask[groupName] = true;
    
            if ( group.markerIcon ) {
                // Prepare the icon objects for Leaflet markers
                self.leafletIcons[groupName] = L.icon( { iconUrl: group.markerIcon, iconSize: group.size } );
            }
        }

        self.recalculateMarkerSizes();
    
        // Get control anchors
        self.bottomLeftAnchor = self.$root.find( '.leaflet-control-container .leaflet-bottom.leaflet-left' );
        self.topRightAnchor = self.$root.find( '.leaflet-control-container .leaflet-top.leaflet-right' );

        // Create a coordinate-under-cursor display
        self.$coordTracker = $( '<div class="leaflet-control datamap-control-coords">' )
                            .appendTo( self.bottomLeftAnchor );
        self.coordTrackingMsg = mw.msg( 'datamap-coordinate-control-text' );
        self.leaflet.on( 'mousemove', function( event ) {
            var lat = event.latlng.lat;
            var lon = event.latlng.lng;
            if ( lat >= -5 && lat <= 105 && lon >= -5 && lon <= 105 ) {
                lat = 100 - lat;
                self.$coordTracker.text( self.coordTrackingMsg
                                       .replace( '$1', lat.toFixed( 2 ) )
                                       .replace( '$2', lon.toFixed( 2 ) ) );
            }
        } );

        // Create a background toggle
        if ( self.config.backgrounds.length > 1 ) {
            var $switch = $( '<select class="leaflet-control datamap-control-backgrounds leaflet-bar">' ).on( 'change', function() {
                self.setCurrentBackground( $(this).val() );
            } ).appendTo( self.topRightAnchor );
            self.config.backgrounds.forEach( function ( background, index ) {
                $( '<option>' ).attr( 'value', index ).text( background.name ).appendTo( $switch );
            } );
        }
    };


    var buildLegend = function () {
        self.$legendRoot = self.$root.find('.datamap-container-legend');

        self.legendTabLayout = new OO.ui.IndexLayout( {
            expanded: false
        } );
        self.legendTabLayout.$element.appendTo( self.$legendRoot );

        buildMarkerSwitching( self.addLegendTab( mw.msg( 'datamap-legend-tab-locations' ) ).$element );

        mw.hook( 'ext.ark.datamaps.afterLegendInitialisation' ).fire( self );
    };


    var buildMarkerSwitching = function ( $container ) {
        var buttonGroup = new OO.ui.ButtonGroupWidget( {} );
        buttonGroup.$element.appendTo( $container );
    
        // Toggle all layers
        {
            var showAllButton = new OO.ui.ButtonWidget( {
                label: mw.msg( 'datamap-toggle-show-all' )
            });
            showAllButton.on('click', function() {
                self.legendGroupToggles.forEach( function( checkbox ) {
                    checkbox.setSelected(true);
                } );
            });
            buttonGroup.addItems([ showAllButton ]);
        }
    
        // Hide all layers
        {
            var hideAllButton = new OO.ui.ButtonWidget( {
                label: mw.msg( 'datamap-toggle-hide-all' )
            } );
            hideAllButton.on( 'click', function() {
                self.legendGroupToggles.forEach( function( checkbox ) {
                    checkbox.setSelected( false );
                } );
            } );
            buttonGroup.addItems( [ hideAllButton ] );
        }
    
        // Cave layer toggle
        // TODO: rework into a generic layer system
        if ( self.isLayerUsed( 'cave' ) ) {
            var caveToggleButton = new OO.ui.ToggleButtonWidget( {
                label: mw.msg( 'datamap-toggle-caves' ),
                value: true
            } );
            caveToggleButton.on( 'click', function() {
                var newState = caveToggleButton.getValue();
                // Update visibility mask for caves
                self.layerVisibilityMask.cave = newState;
                // Update visibility for any marker of an unhidden group with `cave` layer
                self.updateLayerVisibility( function( layerNames ) {
                    return layerNames.indexOf( 'cave' ) >= 0 && self.groupVisibilityMask[layerNames[0]];
                }, newState );
            } );
            buttonGroup.addItems( [ caveToggleButton ] );
        }
    
        // Individual group toggles
        for ( var groupName in self.config.groups ) {
            var group = self.config.groups[groupName];
    
            var checkbox = new OO.ui.CheckboxInputWidget( {
                selected: true
            } );
            var field = new OO.ui.FieldLayout( checkbox, {
                label: group.name,
                align: 'inline'
            } );
    
            checkbox.on( 'change', ( function( groupName, checkbox ) {
                var newState = checkbox.isSelected();
                // Update visibility mask for this group
                self.groupVisibilityMask[groupName] = newState;
                // Update visibility for any marker of this group with any visible layer
                self.updateLayerVisibility( function( layerNames ) {
                    return layerNames[0] == groupName
                        && layerNames.filter( function( x ) {
                            return self.layerVisibilityMask[x] === false;
                        } ).length == 0;
                }, newState );
            } ).bind( null, groupName, checkbox ) );
    
            if ( group.fillColor ) {
                $( '<div class="datamap-legend-circle">' ).css( {
                    width: group.size+4,
                    height: group.size+4,
                    backgroundColor: group.fillColor,
                    borderColor: group.strokeColor || group.fillColor,
                    borderWidth: group.strokeWidth || 1,
                } ).prependTo( field.$header );
            }
    
            if ( group.legendIcon ) {
                field.$header.prepend( $( '<img width=24 height=24/>' ).attr( 'src', group.legendIcon ) );
            }
    
            field.$element.appendTo( $container );
            self.legendGroupToggles.push( checkbox );
        }
    };


    // Request OOUI to be loaded and build the legend
    mw.loader.using( [ 'oojs-ui-core', 'oojs-ui-widgets' ], buildLegend );
    // Prepare the Leaflet map view
    mw.loader.using( 'ext.ark.datamaps.leaflet.core', buildLeafletMap.bind( null, $container.find( '.datamap-holder' ) ) );

    // Request markers from the API
    api.get( {
        action: 'queryDataMap',
        title: config.pageName,
        revid: config.version
    } ).then( function ( data ) {
        self.waitForLeaflet( self.instantiateMarkers.bind( null, data.query.markers ) );
    } ).then( function ( ) {
        $container.find( '.datamap-status' ).remove();
    } );

    return self;
}


function onPageContent( $content ) {
    // Run initialisation for every map, followed by events for gadgets to listen to
    for ( var id in mapConfigs ) {
        mw.hook( 'ext.ark.datamaps.beforeInitialisation' ).fire( mapConfigs[id] );
        var map = initialiseMap( $content.find( '.datamap-container#datamap-' + id ), mapConfigs[id] );
        mw.hook( 'ext.ark.datamaps.afterInitialisation' ).fire( map );
    }
}


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( onPageContent );
