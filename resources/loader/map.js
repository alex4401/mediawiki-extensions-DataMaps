const MapStorage = require( './storage.js' ),
    MarkerPopup = require( './popup.js' ),
    MapLegend = require( './legend.js' ),
    MarkerLegendPanel = require( './markerLegend.js' );
const DISMISSED_OPACITY = 0.4;


function DataMap( id, $root, config ) {
    this.id = id;
    // Root DOM element of the data map
    this.$root = $root;
    // Setup configuration
    this.config = config;
    // Local storage driver
    this.storage = new MapStorage( this );
    // Information of currently set background
    this.background = null;
    this.backgroundIndex = 0;
    // Data set filters
    this.dataSetFilters = this.$root.data( 'filter-groups' ) || null;
    if (this.dataSetFilters) {
        this.dataSetFilters = this.dataSetFilters.split( '|' );
    }
    // MapLegend instance
    this.legend = null;
    // Leaflet.Map instance
    this.leaflet = null;
    // Collection of Leaflet.Icons by group
    this.leafletIcons = {};
    // Collection of Leaflet.FeatureGroups by layer
    this.leafletLayers = {};
    // DOM element of the coordinates display control
    this.$coordTracker = null;
    // Collection of group visibility toggles
    this.legendGroupToggles = [];
    // Mask of visible groups (boolean map)
    this.groupVisibilityMask = {};
    // Mask of visible layers (boolean map)
    this.layerVisibilityMask = {
        cave: true
    };
    // Cached value of the 'datamap-coordinate-control-text' message
    this.coordTrackingMsg = mw.msg( 'datamap-coordinate-control-text' );

    // Request OOUI to be loaded and build the legend
    mw.loader.using( [ 'oojs-ui-core', 'oojs-ui-widgets' ], buildLegend.bind( this ) );
    // Prepare the Leaflet map view
    mw.loader.using( 'ext.ark.datamaps.leaflet.core', buildLeafletMap.bind( this, this.$root.find( '.datamap-holder' ) ) );
}


/*
 * Runs the callback function when the Leaflet map is initialised. This is required if a function/gadget depends on any
 * Leaflet code (global L) having been loaded.
 */
DataMap.prototype.waitForLeaflet = function ( callback ) {
    if ( this.leaflet == null ) {
        setTimeout( this.waitForLeaflet.bind( this, callback ), 25 );
    } else {
        callback();
    }
};


/*
 * Returns true if a layer is used on the map.
 */
DataMap.prototype.isLayerUsed = function ( name ) {
    return this.config.layerIds.indexOf( name ) >= 0;
};


/*
 * Executes the matcher function on every layer, and if true, alters its visibility state to one provided.
 */
DataMap.prototype.updateLayerVisibility = function ( matcher, newState ) {
    for ( const layerName in this.leafletLayers ) {
        if ( matcher( layerName.split( ' ' ) ) ) {
            if ( newState ) {
                this.leafletLayers[layerName].addTo( this.leaflet );
            } else {
                this.leafletLayers[layerName].remove();
            }
        }
    }
};


/*
 * Inverts the latitude in box bounds, as our reference system differs from Leaflet's built-in
 */
const flipLatitudeBox = function ( box ) {
    return [ [ 100-box[0][0], box[0][1] ], [ 100-box[1][0], box[1][1] ] ];
};


/*
 * Returns scale factor to adjust markers for zoom level
 */
DataMap.prototype.getScaleFactorByZoom = function ( a ) {
   return this.leaflet.getZoom() / this.leaflet.options[ a + 'Zoom' ];
};


/*
 * Returns a formatted datamap-coordinate-control-text message.
 */
DataMap.prototype.getCoordLabel = function ( lat, lon ) {
    return this.coordTrackingMsg.replace( '$1', lat.toFixed( 2 ) ).replace( '$2', lon.toFixed( 2 ) );
};


DataMap.prototype.setMarkerOpacity = function ( marker, value ) {
    if ( marker instanceof L.Marker ) {
        marker.setOpacity( value );
    } else {
        marker.setStyle( {
            opacity: value,
            fillOpacity: value
        } );
    }
};


/*
 * Refreshes marker's visual properties
 */
DataMap.prototype.readyMarkerVisuals = function ( type, group, instance, marker ) {
    // Dismissables
    if ( group.canDismiss ) {
        const isDismissed = this.storage.isDismissed( type, instance );
        this.setMarkerOpacity( marker, isDismissed ? DISMISSED_OPACITY : 1 );
    }
};


DataMap.prototype.getLeafletLayer = function ( id ) {
    if ( !this.leafletLayers[id] ) {
        this.leafletLayers[id] = L.featureGroup().addTo( this.leaflet );
    }
    return this.leafletLayers[id];
};


/*
 * Builds markers from a data object
 */
DataMap.prototype.instantiateMarkers = function ( data ) {
    for ( let markerType in data ) {
        const layers = markerType.split( ' ' );
        const groupName = layers[0];
        const group = this.config.groups[groupName];
        const placements = data[markerType];

        // Add a runtime "surface" layer if there is no "cave" layer
        if ( layers.indexOf( 'cave' ) < 0 ) {
            layers.push( '#surface' );
            markerType += ' #surface';
        }

        // Retrieve the Leaflet layer
        const layer = this.getLeafletLayer( markerType );

        // Create markers for instances
        placements.forEach( instance => {
            const position = [ 100-instance[0], instance[1] ];
            let leafletMarker;

            // Construct the marker
            if ( group.markerIcon ) {
                // Fancy icon marker
                leafletMarker = L.marker( position, {
                    icon: this.leafletIcons[groupName]
                } );
            } else {
                // Circular marker
                leafletMarker = L.circleMarker( position, {
                    radius: group.size/2,
                    fillColor: group.fillColor,
                    fillOpacity: 0.7,
                    color: group.strokeColor || group.fillColor,
                    weight: group.strokeWidth || 1,
                } );
            }
            group.markers.push( leafletMarker );

            // Prepare marker for display
            this.readyMarkerVisuals( markerType, group, instance, leafletMarker );

            // Add marker to the layer
            leafletMarker.addTo( layer );

            // Bind a popup building closure (this is more efficient than binds)
            const mType = markerType;
            leafletMarker.bindPopup( () =>
                new MarkerPopup( this, mType, instance, ( instance[2] || {} ), leafletMarker ).build().get( 0 ) );
            // Bind events to update current URL to quickly restore or link to specific markers
            leafletMarker.on( 'popupopen', () => window.history.replaceState( null, "",
                history.replaceState( null, null, this.storage.getMarkerKey( mType, instance ) ) ) );
        } );
    }

    // Rather inefficient if the data set is big and there's lots of chunks, but we don't support streaming yet
    this.recalculateMarkerSizes();
};


/*
 * 
 */
DataMap.prototype.setCurrentBackground = function ( index ) {
    if ( this.background ) {
        this.background.overlay.remove();
    }

    // Check if index is valid, and fall back to first otherwise
    if ( index < 0 || index >= this.config.backgrounds.length ) {
        index = 0;
    }

    this.background = this.config.backgrounds[ index ];
    this.backgroundIndex = index;
    this.background.overlay.addTo( this.leaflet );
    this.background.overlay.bringToBack();
};


DataMap.prototype.recalculateMarkerSizes = function () {
    const scaleMin = this.getScaleFactorByZoom( 'min' ),
        scaleMax = this.getScaleFactorByZoom( 'max' );
    let scaleCir;
    for ( const groupName in this.config.groups ) {
        const group = this.config.groups[groupName];
        if ( group.fillColor ) {
            // Circle: configured marker size is the size of a marker at lowest zoom level, with an optional growth factor
            //         inverse to the zoom level
            scaleCir = this.leaflet.options.scaleMarkersExtraForMinZoom
                ? ( scaleMin + ( 1 - scaleMax ) * ( group.extraMinZoomSize || this.leaflet.options.extraMinZoomSize ) )
                : scaleMin;
            group.markers.forEach( marker => marker.setRadius( ( group.size > 8 ? scaleMin : scaleCir ) * group.size/2 ) );
        } else if ( group.markerIcon ) {
            // Icon: configured marker size is the size of a marker at the highest zoom level
            this.leafletIcons[groupName].options.iconSize = [ group.size[0] * scaleMax, group.size[1] * scaleMax ];
            // Update all existing markers to use the altered icon instance
            group.markers.forEach( marker => marker.setIcon( this.leafletIcons[groupName] ) );
        }
    }
};


DataMap.prototype.restoreDefaultView = function () {
    this.leaflet.setZoom( this.leaflet.options.minZoom );
    this.leaflet.fitBounds( flipLatitudeBox( this.background.at ) );
};


DataMap.prototype.centreView = function () {
    const box = flipLatitudeBox( this.background.at );
    this.leaflet.setView( [ (box[1][0] + box[0][0])/2, (box[1][1] + box[0][1])/2 ] );
};


DataMap.prototype.anchors = {
    bottomLeft: '.leaflet-bottom.leaflet-left',
    topRight: '.leaflet-top.leaflet-right',
    topLeft: '.leaflet-top.leaflet-left'
};


DataMap.prototype.addControl = function ( anchor, $element ) {
    this.$root.find( '.leaflet-control-container ' + anchor ).append( $element );
    return $element;
};


const buildLeafletMap = function ( $holder ) {
    let rendererSettings = {
        padding: 1/3
    };
    let leafletConfig = {
        // Boundaries
        center: [50, 50],
        maxBounds: [[-75,-75], [175, 175]],
        maxBoundsViscosity: 0.2,
        // Zoom settings
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        maxZoom: 5,
        zoomAnimation: true,
        wheelPxPerZoomLevel: 240,
        markerZoomAnimation: false,
        // Minimum zoom is 1.75 on mobile, 2.5 otherwise
        minZoom: ( window.matchMedia( 'screen and (max-width: 1000px)' ).matches ? 1.75 : 2.5 ),
        // Pan settings
        inertia: false,
        // Internal
        scaleMarkersExtraForMinZoom: true,
        extraMinZoomSize: 1.8,
    };
    leafletConfig = $.extend( leafletConfig, this.config.leafletSettings );
    rendererSettings = $.extend( rendererSettings, leafletConfig.rendererSettings );
    leafletConfig = $.extend( leafletConfig, {
        crs: L.CRS.Simple,
        // Renderer - using canvas for performance with padding of 1/3rd (to draw some more markers outside of view for panning UX)
        preferCanvas: true,
        renderer: L.canvas( rendererSettings )
    } );

    this.leaflet = L.map( $holder.get( 0 ), leafletConfig );

    // Prepare all backgrounds
    this.config.backgrounds.forEach( background => {
        background.overlay = L.featureGroup();

        // Image overlay:
        // Latitude needs to be flipped as directions differ between Leaflet and ARK
        background.at = background.at || [ [100, 0], [0, 100] ];
        L.imageOverlay( background.image, flipLatitudeBox( background.at ) ).addTo( background.overlay );

        // Prepare overlay layers
        if ( background.overlays ) {
            background.overlays.forEach( overlay => {
                const rect = L.rectangle( flipLatitudeBox( overlay.at ), {
                    fillOpacity: 0.05
                } ).addTo( background.overlay );

                if ( overlay.name ) {
                    rect.bindTooltip( overlay.name );
                }
            } );
        }
    } );
    // Switch to the last chosen one or first defined
    this.setCurrentBackground( this.storage.get( 'background' ) || 0 );
    // Restore default view
    this.restoreDefaultView();

    for ( const groupName in this.config.groups ) {
        const group = this.config.groups[groupName];
        group.markers = [];

        // Set as visible in the visibility mask
        this.groupVisibilityMask[groupName] = true;

        if ( group.markerIcon ) {
            // Prepare the icon objects for Leaflet markers
            this.leafletIcons[groupName] = L.icon( { iconUrl: group.markerIcon, iconSize: group.size } );
        }
    }

    // Recalculate marker sizes when zoom ends
    this.leaflet.on( 'zoomend', () => this.recalculateMarkerSizes() );

    // Create a coordinate-under-cursor display
    this.$coordTracker = this.addControl( this.anchors.bottomLeft, $( '<div class="leaflet-control datamap-control-coords">' ) );
    this.leaflet.on( 'mousemove', event => {
        const lat = event.latlng.lat;
        const lon = event.latlng.lng;
        if ( lat >= -5 && lat <= 105 && lon >= -5 && lon <= 105 ) {
            this.$coordTracker.text( this.getCoordLabel( 100 - lat, lon ) );
        }
    } );

    // Create a background toggle
    if ( this.config.backgrounds.length > 1 ) {
        this.$backgroundSwitch = this.addControl( this.anchors.topRight,
            $( '<select class="leaflet-control datamap-control-backgrounds leaflet-bar">' )
            .on( 'change', () => {
                this.setCurrentBackground( this.$backgroundSwitch.val() );
                // Remember the choice
                this.storage.set( 'background', this.$backgroundSwitch.val() );
            } )
        );
        this.config.backgrounds.forEach( ( background, index ) => {
            $( '<option>' ).attr( 'value', index ).text( background.name ).appendTo( this.$backgroundSwitch );
        } );
        this.$backgroundSwitch.val( this.backgroundIndex );
    }

    // Extend zoom control to add buttons to reset or centre the view
    const $viewControls = this.addControl( this.anchors.topLeft,
        $( '<div class="leaflet-control leaflet-bar datamap-control-viewcontrols">' ) );
    $viewControls.append(
        $( '<a role="button" class="datamap-control-viewreset" aria-disabled="false"></a>' )
        .attr( {
            title: mw.msg( 'datamap-control-reset-view' ),
            'aria-label': mw.msg( 'datamap-control-reset-view' )
        } )
        .on( 'click', () => this.restoreDefaultView() )
    );
    $viewControls.append(
        $( '<a role="button" class="datamap-control-viewcentre" aria-disabled="false"></a>' )
        .attr( {
            title: mw.msg( 'datamap-control-centre-view' ),
            'aria-label': mw.msg( 'datamap-control-centre-view' )
        } )
        .on( 'click', () => this.centreView() )
    );
};


const buildLegend = function () {
    this.legend = new MapLegend( this );
    this.markerLegend = new MarkerLegendPanel( this.legend, mw.msg( 'datamap-legend-tab-locations' ) );
    this.markerLegend.addTotalToggles();

    const hasCaves = this.isLayerUsed( 'cave' );
    const hasDismissables = Object.values( this.config.groups ).some( x => x.canDismiss );
    if ( hasCaves || hasDismissables ) {
        this.markerLegend.initialiseLayersArea();

        if ( hasCaves ) {
            this.markerLegend.addMarkerLayerToggle( '#surface', mw.msg( 'datamap-layer-surface' ) );
            this.markerLegend.addMarkerLayerToggle( 'cave', mw.msg( 'datamap-layer-cave' ) );
        }

        if ( hasDismissables ) {
            //this.markerLegend.addMarkerLayerToggle( '#dismissed', mw.msg( 'datamap-layer-dismissed' ) );
        }
    }

    // Build individual group toggles
    for ( const groupId in this.config.groups ) {
        if ( !this.dataSetFilters || this.dataSetFilters.indexOf( groupId ) >= 0 ) {
            this.markerLegend.addMarkerGroupToggle( groupId, this.config.groups[groupId] );
        }
    }

    mw.hook( 'ext.ark.datamaps.afterLegendInitialisation.' + this.id ).fire( this );
};


module.exports = DataMap;