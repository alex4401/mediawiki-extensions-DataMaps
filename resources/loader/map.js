const MapStorage = require( './storage.js' ),
    MarkerLayerManager = require( './layerManager.js' ),
    MarkerPopup = require( './popup.js' ),
    MapLegend = require( './legend.js' ),
    MarkerLegendPanel = require( './markerLegend.js' ),
    mwApi = new mw.Api();


function DataMap( id, $root, config ) {
    this.id = id;
    // Root DOM element of the data map
    this.$root = $root;
    // Setup configuration
    this.config = config;
    // Local storage driver
    this.storage = new MapStorage( this );
    // Layering driver
    this.layerManager = new MarkerLayerManager( this );
    // Information of currently set background
    this.background = null;
    this.backgroundIndex = 0;
    // Data set filters
    this.dataSetFilters = this.$root.data( 'filter-groups' ) || null;
    if (this.dataSetFilters) {
        this.dataSetFilters = this.dataSetFilters.split( '|' );
    }
    //
    this.$status = $root.find( '.datamap-status' );
    // MapLegend instance
    this.legend = null;
    // Leaflet.Map instance
    this.leaflet = null;
    // Collection of Leaflet.Icons by group
    this.leafletIcons = {};
    // DOM element of the coordinates display control
    this.$coordTracker = null;
    // Collection of group visibility toggles
    this.legendGroupToggles = [];
    // Cached value of the 'datamap-coordinate-control-text' message
    this.coordTrackingMsg = mw.msg( 'datamap-coordinate-control-text' );

    // Request OOUI to be loaded and build the legend
    mw.loader.using( [
        'oojs-ui-core',
        'oojs-ui-widgets'
    ], buildLegend.bind( this ) );
    // Prepare the Leaflet map view
    mw.loader.using( [
        'ext.ark.datamaps.leaflet.core',
        'ext.ark.datamaps.leaflet.extra'
    ], buildLeafletMap.bind( this, this.$root.find( '.datamap-holder' ) ) );
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
 * Inverts the latitude in box bounds, as our reference system differs from Leaflet's built-in
 */
const flipLatitudeBox = function ( box ) {
    return [ [ 100-box[0][0], box[0][1] ], [ 100-box[1][0], box[1][1] ] ];
};
DataMap.prototype.flipLatitudeBox = flipLatitudeBox;


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
DataMap.prototype.readyMarkerVisuals = function ( type, group, instance, marker ) { };


/*
 * Builds markers from a data object
 */
DataMap.prototype.instantiateMarkers = function ( data ) {
    // Register all layers in this package
    for ( const markerType in data ) {
        markerType.split( ' ' ).forEach( name => this.layerManager.register( name ) );
    }
    
    // Unpack markers
    for ( const markerType in data ) {
        const layers = markerType.split( ' ' );
        const groupName = layers[0];
        const group = this.config.groups[groupName];
        const placements = data[markerType];

        // Create markers for instances
        placements.forEach( instance => {
            const position = [ 100-instance[0], instance[1] ];
            let leafletMarker;

            // Construct the marker
            if ( group.markerIcon ) {
                // Fancy icon marker
                leafletMarker = new L.Ark.IconMarker( position, {
                    icon: this.leafletIcons[groupName],
                    dismissed: group.canDismiss ? this.storage.isDismissed( markerType, instance ) : false
                } );
            } else {
                // Circular marker
                leafletMarker = new L.Ark.CircleMarker( position, {
                    baseRadius: group.size/2,
                    expandZoomInvEx: group.extraMinZoomSize,
                    fillColor: group.fillColor,
                    fillOpacity: 0.7,
                    color: group.strokeColor || group.fillColor,
                    weight: group.strokeWidth || 1,
                } );
            }

            // Prepare marker for display
            this.readyMarkerVisuals( markerType, group, instance, leafletMarker );

            // Add marker to the layer
            this.layerManager.addMember( markerType, leafletMarker );

            // Bind a popup building closure (this is more efficient than binds)
            const mType = markerType;
            leafletMarker.bindPopup( () =>
                new MarkerPopup( this, mType, instance, ( instance[2] || {} ), leafletMarker ).build().get( 0 ) );
        } );
    }
};


DataMap.prototype.streamMarkersIn = function ( pageName, version, filter, successCallback, errorCallback ) {
    const query = {
        action: 'queryDataMap',
        title: pageName,
        revid: version
    };
    if ( filter ) {
        query.filter = filter.join( '|' );
    }
    return mwApi.get( query ).then(
        data => {
            if ( data.error )
                errorCallback();
            else
                this.waitForLeaflet( () => {
                    this.instantiateMarkers( data.query.markers );
                    successCallback();
                } );
        },
        errorCallback
    );
};


/*
 * 
 */
DataMap.prototype.setCurrentBackground = function ( index ) {
    // Remove existing layers off the map
    if ( this.background ) {
        this.background.layers.forEach( x => x.remove() );
        this.background = null;
    }

    // Check if index is valid, and fall back to first otherwise
    if ( index < 0 || index >= this.config.backgrounds.length ) {
        index = 0;
    }

    // Update state
    this.background = this.config.backgrounds[ index ];
    this.backgroundIndex = index;

    // Push layers back onto the map
    this.background.layers.forEach( x => {
        x.addTo( this.leaflet );
        x.bringToBack();
    } );
};


DataMap.prototype.updateMarkerScaling = function () {
    const zoom = this.leaflet.getZoom();
    this.leaflet.options.markerScaleI = zoom / this.leaflet.options.minZoom;
    this.leaflet.options.markerScaleA = zoom / this.leaflet.options.maxZoom;
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
    this.$root.find( `.leaflet-control-container ${anchor}` ).append( $element );
    return $element;
};


DataMap.prototype.buildBackgroundOverlayObject = function ( overlay ) {
    let result;

    // Construct an image or rectangular layer
    if ( overlay.image ) {
        result = L.imageOverlay( overlay.image, flipLatitudeBox( overlay.at ) );
    } else {
        result = L.rectangle( flipLatitudeBox( overlay.at ), {
            fillOpacity: 0.05
        } );
    }

    // Bind name as tooltip
    if ( overlay.name ) {
        result.bindTooltip( overlay.name );
    }

    return result;
};


const buildLeafletMap = function ( $holder ) {
    const leafletConfig = $.extend( true, {
        // Boundaries
        center: [50, 50],
        maxBounds: [[-75,-75], [175, 175]],
        maxBoundsViscosity: 0.7,
        // Zoom settings
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        maxZoom: 5,
        wheelPxPerZoomLevel: 240,
        minZoom: L.Browser.mobile ? ( L.Browser.retina ? 1 : 1.75 ) : 2,
        // Zoom animation causes some awkward locking as Leaflet waits for the animation to finish before processing more zoom
        // requests, but disabling it causes some updates to be distorted (for example, the canvas renderer will drift).
        // We include a patch in our Leaflet builds to disable animations on desktop-style zooms.
        zoomAnimation: true,
        markerZoomAnimation: true,
        // Do not allow pinch-zooming to surpass max zoom even temporarily. This seems to cause a mispositioning.
        bounceAtZoomLimits: false,
        // Pan settings
        inertia: false,
        // Zoom-based marker scaling
        shouldExpandZoomInvEx: true,
        expandZoomInvEx: 1.8,
        // Canvas renderer settings - using canvas for performance with padding of 1/3rd (to draw some more markers outside of
        // view for panning UX)
        preferCanvas: true,
        rendererSettings: {
            padding: 1/3
        },
    }, this.config.leafletSettings );
    // Specify the coordinate reference system and initialise the renderer
    leafletConfig.crs = L.CRS.Simple;
    leafletConfig.renderer = L.canvas( leafletConfig.rendererSettings );

    this.leaflet = L.map( $holder.get( 0 ), leafletConfig );

    // Prepare all backgrounds
    this.config.backgrounds.forEach( background => {
        background.layers = [];

        // Image overlay:
        // Latitude needs to be flipped as directions differ between Leaflet and ARK
        background.at = background.at || [ [100, 0], [0, 100] ];
        background.layers.push( L.imageOverlay( background.image, flipLatitudeBox( background.at ) ) );

        // Prepare overlay layers
        if ( background.overlays ) {
            background.overlays.forEach( overlay => background.layers.push( this.buildBackgroundOverlayObject( overlay ) ) );
        }
    } );
    // Switch to the last chosen one or first defined
    this.setCurrentBackground( this.storage.get( 'background' ) || 0 );
    // Restore default view
    this.restoreDefaultView();

    for ( const groupName in this.config.groups ) {
        const group = this.config.groups[groupName];

        // Register with the layer manager
        this.layerManager.register( groupName );

        if ( group.markerIcon ) {
            // Prepare the icon objects for Leaflet markers
            this.leafletIcons[groupName] = L.icon( { iconUrl: group.markerIcon, iconSize: group.size } );
        }
    }

    // Recalculate marker sizes when zoom ends
    this.leaflet.on( 'zoom', () => this.updateMarkerScaling() );
    this.updateMarkerScaling();

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
    // Determine if we'll need a layer dropdown
    const hasCaves = this.isLayerUsed( 'cave' );
    const withLayerDropdown = hasCaves;

    // Initialise legend objects
    this.legend = new MapLegend( this );
    this.markerLegend = new MarkerLegendPanel( this.legend, mw.msg( 'datamap-legend-tab-locations' ), true, withLayerDropdown );

    // Build the surface and caves toggle
    if ( hasCaves ) {
        this.markerLegend.addMarkerLayerToggleInclusive( this.markerLegend.$layersPopup, 'cave', mw.msg( 'datamap-layer-surface' ) );
        this.markerLegend.addMarkerLayerToggleExclusive( this.markerLegend.$layersPopup, 'cave', mw.msg( 'datamap-layer-cave' ) );
    }

    // Build individual group toggles
    for ( const groupId in this.config.groups ) {
        if ( !this.dataSetFilters || this.dataSetFilters.indexOf( groupId ) >= 0 ) {
            this.markerLegend.addMarkerGroupToggle( groupId, this.config.groups[groupId] );
        }
    }

    mw.hook( `ext.ark.datamaps.afterLegendInitialisation.${this.id}` ).fire( this );
};


module.exports = DataMap;