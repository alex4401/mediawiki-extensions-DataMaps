const MapStorage = require( './storage.js' ),
    Enums = require( './enums.js' ),
    MarkerLayerManager = require( './layerManager.js' ),
    MarkerPopup = require( './popup.js' ),
    MarkerStreamingManager = require( './stream.js' ),
    MapLegend = require( './legend.js' ),
    MarkerLegendPanel = require( './markerLegend.js' ),
    EventEmitter = require( './events.js' ),
    DismissableMarkersLegend = require( './dismissables.js' ),
    Util = require( './util.js' );
let Leaflet = null;


class DataMap extends EventEmitter {
    constructor( id, $root, config ) {
        super();

        this.id = id;
        // Root DOM element of the data map
        this.$root = $root;
        // Setup configuration
        this.config = config;
        // Local storage driver
        this.storage = new MapStorage( this );
        this.globalStorage = new MapStorage( this, 'global' );
        // Layering driver
        this.layerManager = new MarkerLayerManager( this );
        // Marker data streaming controller
        this.streaming = new MarkerStreamingManager( this );
        // Information of currently set background
        this.background = null;
        this.backgroundIndex = 0;
        // Data set filters
        this.dataSetFilters = this.$root.data( 'filter-groups' ) || null;
        if ( this.dataSetFilters ) {
            this.dataSetFilters = this.dataSetFilters.split( '|' );
        }
        // DOM element to display any status messages
        this.$status = $root.find( '.datamap-status' );
        // MapLegend instance
        this.legend = null;
        // Leaflet.Map instance
        this.leaflet = null;
        // Collection of Leaflet.Icons by group
        this.iconCache = {};
        // DOM element of the coordinates display control
        this.$coordTracker = null;
        // Cached value of the 'datamap-coordinate-control-text' message
        this.coordTrackingMsg = mw.msg( 'datamap-coordinate-control-text' );
        // Retrieve a `marker` parameter from the query string if one is present
        this.markerIdToAutoOpen = null;
        const tabberId = this.getParentTabberNeueId();
        if ( !tabberId || ( tabberId && tabberId == window.location.hash.substr( 1 ) ) ) {
            this.markerIdToAutoOpen = Util.getQueryParameter( 'marker' );
        }

        // Coordinate reference system
        // If coordinate space spec is oriented [ lower lower upper upper ], assume top left corner as origin point (latitude will
        // be flipped). If [ upper upper lower lower ], assume bottom left corner (latitude will be unchanged). Any other layout is
        // invalid.
        if ( !this.config.crs ) {
            this.config.crs = [ [ 0, 0 ], [ 100, 100 ] ];
        }
        this.crsOrigin = ( this.config.crs[0][0] < this.config.crs[1][0] && this.config.crs[0][1] < this.config.crs[1][1] )
            ? Enums.CRSOrigin.TopLeft : Enums.CRSOrigin.BottomLeft;
        // Y axis is authoritative, this is really just a cosmetic choice influenced by ARK (latitude first). X doesn't need to be
        // mapped on a separate scale from Y, unless we want them to always be squares.
        let crsYHigh = Math.max( this.config.crs[0][0], this.config.crs[1][0] );
        this.crsScaleX = this.crsScaleY = 100 / crsYHigh;

        // Set up internal event handlers
        this.on( 'markerReady', this.openPopupIfUriMarker, this );
        this.on( 'streamingDone', this.refreshMaxBounds, this );
        this.on( 'linkedEvent', this.onLinkedEventReceived, this );

        // DEPRECATED(v0.13.0:v0.14.0): use class constants
        this.anchors = DataMap.anchors;

        // Request OOUI to be loaded and build the legend
        if ( !this.isFeatureBitSet( Enums.MapFlags.HideLegend ) ) {
            mw.loader.using( [
                'oojs-ui-core',
                'oojs-ui-widgets'
            ], () => this._initialiseLegend() );
        }

        // Prepare the Leaflet map view
        mw.loader.using( 'ext.ark.datamaps.leaflet', () => {
            if ( Leaflet === null ) {
                Leaflet = Util.getLeaflet();
            }
            this._initialiseLeaflet( this.$root.find( '.datamap-holder' ) );
        } );

        // Load search add-on
        if ( this.isFeatureBitSet( Enums.MapFlags.Search ) ) {
            mw.loader.using( [
                'oojs-ui-core',
                'ext.ark.datamaps.styles.search',
                'ext.ark.datamaps.search'
            ] );
        }
    }


    /**
     * Checks if all bits of a mask are set on the configured flags constant.
     * @param {int} mask Feature's bit mask.
     * @returns {boolean}
     */
    isFeatureBitSet( mask ) {
        return Util.isBitSet( this.config.flags, mask );
    }


    /**
     * Runs the callback function when the Leaflet map is initialised. If you only need access to Leaflet's API, require module
     * `ext.ark.datamaps.leaflet` instead with ResourceLoader.
     * @param {Function} callback Function to run when Leaflet map is initialised.
     * @param {object?} context Object to use as callback's context.
     */
    waitForLeaflet( callback, context ) {
        if ( this.leaflet == null ) {
            this.on( 'leafletLoaded', callback, context );
        } else {
            callback.call( context );
        }
    }


    /*
     * Runs the callback function when the map legend is initialised.
     * @param {Function} callback Function to run when the legend is initialised.
     * @param {object?} context Object to use as callback's context.
    */
    waitForLegend( callback, context ) {
        if ( this.legend == null ) {
            this.on( 'legendLoaded', callback, context );
        } else {
            callback.call( context );
        }
    }


    getParentTabberNeuePanel() {
        if ( !this.$_tabberPanel ) {
            this.$_tabberPanel = this.$root.closest( 'article.tabber__panel' );
        }
        return this.$_tabberPanel && this.$_tabberPanel.length > 0 ? this.$_tabberPanel : null;
    }


    getParentTabberNeue() {
        if ( !this.$_tabber ) {
            this.$_tabber = this.$root.closest( 'div.tabber' );
        }
        return this.$_tabber && this.$_tabber.length > 0 ? this.$_tabber : null;
    }


    /**
     * Finds ID of the TabberNeue tab this map is in. If not inside tabber, this will be null.
     * @returns {string?}
    */
    getParentTabberNeueId() {
        const $panel = this.getParentTabberNeuePanel();
        return $panel ? ( $panel.attr( 'id' ) || $panel.attr( 'title' ).replace( ' ', '_' ) ) : null;
    }


    /**
     * Returns true if a layer is used on the map. This is a look-up on the static configuration provided by the server, and does
     * not depend on any data being loaded.
     * @param {string} name Layer name.
     */
    isLayerUsed( name ) {
        return this.config.layerIds.indexOf( name ) >= 0;
    }


    /**
     * Maps a point from map's coordinate reference system specified by the server, to the universal space [ 0 0 100 100 ].
     * @param {array} point Array with two number elements: X and Y coordinates.
     */
    translatePoint( point ) {
        return this.crsOrigin == Enums.CRSOrigin.TopLeft
            ? [ ( this.config.crs[1][0] - point[0] ) * this.crsScaleY, point[1] * this.crsScaleX ]
            : [ point[0] * this.crsScaleY, point[1] * this.crsScaleX ];
    }


    /*
     * Maps a box from map's coordinate reference system specified by the server, to the universal space [ 0 0 100 100 ].
     */
    translateBox( box ) {
        return this.crsOrigin == Enums.CRSOrigin.TopLeft
            ? [ [ ( this.config.crs[1][0] - box[0][0] ) * this.crsScaleY, box[0][1] * this.crsScaleX ],
                [ ( this.config.crs[1][0] - box[1][0] ) * this.crsScaleY, box[1][1] * this.crsScaleX ] ]
            : [ [ box[0][0] * this.crsScaleY, box[0][1] * this.crsScaleX ],
                [ box[1][0] * this.crsScaleY, box[1][0] * this.crsScaleX ] ];
    }


    /*
     * Returns a formatted datamap-coordinate-control-text message.
     */
    getCoordLabel( latOrInstance, lon ) {
        if ( Array.isArray( latOrInstance ) ) {
            lon = latOrInstance[1];
            latOrInstance = latOrInstance[0];
        }
        return this.coordTrackingMsg.replace( '$1', latOrInstance.toFixed( 2 ) ).replace( '$2', lon.toFixed( 2 ) );
    }


    /*
     * Returns global storage interface for global collectibles, local otherwise.
    */
    getStorageForMarkerGroup( group ) {
        return Util.isBitSet( group.flags, Enums.MarkerGroupFlags.Collectible_GlobalGroup ) ? this.globalStorage : this.storage;
    }


    /*
     * Handles a event sent by another data map on this page. This is used for cross-communication. Sender map is exposed under
     * `event.map`.
     *
     * Message delivery is handled by the bootstrap itself, and not maps.
    */
    onLinkedEventReceived( event ) {
        switch ( event.type ) {
            /*
             * Sent when a global group's collected status changes. Data contains affected `groupId` and `state` after changed.
            */
            case 'groupDismissChange':
                const group = this.config.groups[event.groupId];
                if ( group && Util.isBitSet( group.flags, Enums.MarkerGroupFlags.Collectible_GlobalGroup ) ) {
                    this._updateGlobalDismissal( event.groupId, event.state );
                }
                break;
        }
    }


    /*
     * For a group, updates each marker's dismissal state and notifies other components (such as checklists). This may be called
     * either by natural/direct user interaction or a linked event.
    */
    _updateGlobalDismissal( groupId, state ) {
        for ( const leafletMarker of this.layerManager.byLayer[groupId] ) {
            leafletMarker.setDismissed( state );
            this.fire( 'markerDismissChange', leafletMarker );
        }
        this.fire( 'groupDismissChange', groupId );
    }


    /*
     * Switches marker's (or its group's) collected status in storage, updates visuals, and notifies other components. In case of
     * global collectibles also fires a linked event to notify other maps on the page.
    */
    toggleMarkerDismissal( leafletMarker ) {
        const groupId = leafletMarker.attachedLayers[0];
        const mode = Util.getGroupCollectibleType( this.config.groups[groupId] );
        const isIndividual = mode === Enums.MarkerGroupFlags.Collectible_Individual,
            storage = this.getStorageForMarkerGroup( this.config.groups[groupId] );
        const state = storage.toggleDismissal( isIndividual ? Util.getMarkerId( leafletMarker ) : groupId, !isIndividual );
        if ( isIndividual ) {
            // Update this marker only
            leafletMarker.setDismissed( state );
            this.fire( 'markerDismissChange', leafletMarker );
        } else {
            this._updateGlobalDismissal( groupId, state );
            // If global, broadcast an event to other maps on this page
            if ( mode === Enums.MarkerGroupFlags.Collectible_GlobalGroup ) {
                this.fire( 'sendLinkedEvent', {
                    type: 'groupDismissChange',
                    groupId: groupId,
                    state: state
                } );
            }
        }
        return state;
    }


    /*
     * Opens a marker's popup if the UID matches the `marker` query parameter
     */
    openPopupIfUriMarker( leafletMarker ) {
        if ( this.markerIdToAutoOpen != null && Util.getMarkerId( leafletMarker ) === this.markerIdToAutoOpen ) {
            leafletMarker.openPopup();
        }
    }


    /*
     * Returns a Leaflet icon object for marker layers. All access is cached.
     *
     * Group icon is used if there is no layer overriding it. However, if there is one, first such layer is used and rest are
     * discarded.
    */
    getIconFromLayers( layers ) {
        const markerType = layers.join( ' ' );
        // Construct the object if not found in cache
        if ( !this.iconCache[markerType] ) {
            const group = this.config.groups[layers[0]];

            // Look for the first layer of this marker that has an icon override property
            let markerIcon = group.markerIcon;
            const override = layers.find( x => this.config.layers[x] && this.config.layers[x].markerIcon );
            if ( override ) {
                markerIcon = this.config.layers[override].markerIcon;
            }
        
            this.iconCache[markerType] = new L.Icon( { iconUrl: markerIcon, iconSize: group.size } );
        }
        return this.iconCache[markerType];
    }


    /**
     * Creates a Leaflet marker instance from information provided by the API: layers, and an array with latitude, longitude,
     * and optional data (the "state").
     * 
     * Produces a `markerReady(Marker)` event. This event should be used sparingly whenever there's a possibility for a
     * hot-path.
    */
    createMarkerFromApiInstance( layers, instance ) {
        const group = this.config.groups[layers[0]],
            position = this.translatePoint( instance );
        let leafletMarker;

        // Construct the marker
        if ( group.markerIcon ) {
            // Fancy icon marker
            leafletMarker = new L.Ark.IconMarker( position, {
                icon: this.getIconFromLayers( layers )
            } );
        } else {
            // Circular marker
            leafletMarker = new L.Ark.CircleMarker( position, {
                baseRadius: group.size/2,
                expandZoomInvEx: group.extraMinZoomSize,
                fillColor: group.fillColor,
                fillOpacity: 0.7,
                color: group.strokeColor || group.fillColor,
                weight: group.strokeWidth || 1
            } );
        }

        // Initialise state if it's missing
        if ( !instance[2] ) {
            instance[2] = {};
        }

        // Persist original coordinates and state
        leafletMarker.apiInstance = instance;

        // Add marker to the layer
        this.layerManager.addMember( layers, leafletMarker );

        // Update dismissal status if storage says it's been dismissed
        const collectibleMode = Util.getGroupCollectibleType( group );
        if ( collectibleMode ) {
            const isIndividual = collectibleMode == Enums.MarkerGroupFlags.Collectible_Individual,
                storage = this.getStorageForMarkerGroup( group );
            leafletMarker.setDismissed( storage.isDismissed( isIndividual ? Util.getMarkerId( leafletMarker ) : layers[0],
                !isIndividual ) );
        }

        // Set up the marker popup
        MarkerPopup.bindTo( this, leafletMarker );

        // Fire an event so other components may prepare the marker
        this.fire( 'markerReady', leafletMarker );

        return leafletMarker;
    }


    /**
     * Creates a Leaflet marker instance with given layers, position and API state object.
     * @param {array} layers Array of string layer names.
     * @param {array} position Point to place the marker at.
     * @param {object?} state Optional object with fields: label, desc, image, article, search.
     * @returns Leaflet marker instance of type Leaflet.Ark.IconMarker or Leaflet.Ark.CircleMarker.
     */
    createMarker( layers, position, state ) {
        return this.createMarkerFromApiInstance( layers, [ position[0], position[1], state ] );
    }


    /*
     * Builds markers from a data object.
     */
    instantiateMarkers( data ) {
        // Register all layers in this package
        for ( const markerType in data ) {
            markerType.split( ' ' ).forEach( name => this.layerManager.register( name ) );
        }

        // Unpack markers
        for ( const markerType in data ) {
            const layers = markerType.split( ' ' );
            const placements = data[markerType];
            // Create markers for instances
            for ( const instance of placements ) {
                this.fire( 'markerReady', this.createMarkerFromApiInstance( layers, instance ) );
            }
        }

        this.fire( 'streamingDone' );
    }


    /*
     * 
     */
    setCurrentBackground( index ) {
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

        // Hide any unmatching "bg" sub-layer
        this.layerManager.setOptionalPropertyRequirement( 'bg', this.background.layer );
    }


    /**
     * Updates map options regarding our custom marker scaling behaviour.
     */
    updateMarkerScaling() {
        const zoom = this.leaflet.getZoom();
        // Inverse scale: zoom to minimum value
        this.leaflet.options.markerScaleI = zoom / this.leaflet.options.minZoom;
        // Percentage scale: zoom to maximum value
        this.leaflet.options.markerScaleA = zoom / this.leaflet.options.maxZoom;
    }


    restoreDefaultView() {
        this.leaflet.setZoom( this.leaflet.options.minZoom );
        this.leaflet.fitBounds( this.translateBox( this.background.at ) );
    }


    centreView() {
        const box = this.translateBox( this.background.at );
        this.leaflet.setView( [ (box[1][0] + box[0][0])/2, (box[1][1] + box[0][1])/2 ] );
    }


    /**
     * Adds a custom control to Leaflet's container.
     * @note Requires the Leaflet map to be initialised.
     * @param {string} anchor Anchor selector (common ones are found in DataMap.anchors).
     * @param {Element} $element DOM node of the custom control.
     * @param {boolean} shouldPrepend Whether to add the control to the beginning of the anchor.
     * @returns $element for chaining.
     */
    addControl( anchor, $element, shouldPrepend ) {
        this.$root.find( `.leaflet-control-container ${anchor}` )[ shouldPrepend ? 'prepend' : 'append' ]( $element );
        return $element;
    }


    buildBackgroundOverlayObject( overlay ) {
        let result;

        // Construct a layer
        if ( overlay.image ) {
            // Construct an image
            result = new Leaflet.ImageOverlay( overlay.image, this.translateBox( overlay.at ), {
                // Expand the DOM element's width and height by 0.5 pixels. This helps with gaps between tiles.
                antiAliasing: 0.5
            } );
        } else if ( overlay.path ) {
            // Construct a polyline
            result = new Leaflet.Polyline( overlay.path.map( p => this.translatePoint( p ) ), {
                color: overlay.colour || Leaflet.Path.prototype.options.color,
                weight: overlay.thickness || Leaflet.Path.prototype.options.weight
            } );
        } else {
            // Construct a rectangle
            result = new Leaflet.Rectangle( this.translateBox( overlay.at ), {
                color: overlay.strokeColour || Leaflet.Path.prototype.options.color,
                fillColor: overlay.colour || Leaflet.Path.prototype.options.fillColor
            } );
        }

        // Bind name as tooltip
        if ( overlay.name ) {
            result.bindTooltip( overlay.name );
        }

        return result;
    }


    /**
     * Calculates max bounds for a map from its contents (all geometrical layers are included). This is usually done
     * after a data chunk is streamed in, and is fairly expensive.
     */
    refreshMaxBounds() {
    	const bounds = new Leaflet.LatLngBounds();
        // Collect content bounds
    	for ( const id in this.leaflet._layers ) {
    		const layer = this.leaflet._layers[id];
            if ( layer.getBounds || layer.getLatLng ) {
    		    bounds.extend( layer.getBounds ? layer.getBounds() : layer.getLatLng() );
            }
    	}
        // Add padding
        const nw = bounds.getNorthWest(),
            se = bounds.getSouthEast();
        bounds.extend( [ [ se.lat - DataMap.BOUNDS_PADDING[0], se.lng + DataMap.BOUNDS_PADDING[1] ],
            [ nw.lat + DataMap.BOUNDS_PADDING[0], nw.lng - DataMap.BOUNDS_PADDING[1] ] ] );
        // Update Leaflet instance
        this.leaflet.setMaxBounds( bounds );
    }


    _initialiseLeaflet( $holder ) {
        // If FF_DISABLE_ZOOM is set, prevent all kind of zooming
        if ( this.isFeatureBitSet( Enums.MapFlags.DisableZoom ) ) {
            this.config.leafletSettings = $.extend( {
                zoomControl: false,
                boxZoom: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                touchZoom: false,
                maxZoom: 2.75,
                minZoom: 2.75,
                zoom: 2.75
            }, this.config.leafletSettings || {} );
        }

        // Prepare settings for Leaflet
        const leafletConfig = $.extend( true, {
            // Boundaries
            center: [ 50, 50 ],
            maxBounds: [ [ -100, -100 ], [ 200, 200 ] ],
            maxBoundsViscosity: 0.7,
            // Zoom settings
            zoomSnap: 0.25,
            zoomDelta: 0.25,
            maxZoom: 5,
            wheelPxPerZoomLevel: 240,
            minZoom: Leaflet.Browser.mobile ? ( Leaflet.Browser.retina ? 1 : 1.75 ) : 2,
            // Zoom animation causes some awkward locking as Leaflet waits for the animation to finish before processing
            // more zoom requests, but disabling it causes some updates to be distorted (for example, the canvas renderer
            // will drift). We include a patch in our Leaflet builds to disable animations on desktop-style zooms.
            zoomAnimation: true,
            markerZoomAnimation: true,
            // Do not allow pinch-zooming to surpass max zoom even temporarily. This seems to cause a mispositioning.
            bounceAtZoomLimits: false,
            // Pan settings
            inertia: false,
            // Zoom-based marker scaling
            shouldExpandZoomInvEx: true,
            expandZoomInvEx: 1.8,
            // Canvas renderer settings - using canvas for performance with padding of 1/3rd (to draw some more markers
            // outside of view for panning UX)
            preferCanvas: true,
            rendererSettings: {
                padding: 1/3
            },
        }, this.config.leafletSettings );
        // Specify the coordinate reference system and initialise the renderer
        leafletConfig.crs = Leaflet.CRS.Simple;
        leafletConfig.renderer = new Leaflet.Canvas( leafletConfig.rendererSettings );

        // Initialise the Leaflet map
        this.leaflet = new Leaflet.Map( $holder.get( 0 ), leafletConfig );

        // Prepare all backgrounds
        this.config.backgrounds.forEach( ( background, index ) => {
            background.layers = [];

            // Set the associated layer name
            background.layer = background.layer || index;

            // Image overlay:
            // Latitude needs to be flipped as directions differ between Leaflet and ARK
            background.at = background.at || this.config.crs;
            if ( background.image ) {
                background.layers.push( new Leaflet.ImageOverlay( background.image, this.translateBox( background.at ), {
                    antiAliasing: 0.5
                } ) );
            }

            // Prepare overlay layers
            if ( background.overlays ) {
                background.overlays.forEach( overlay => background.layers.push(
                    this.buildBackgroundOverlayObject( overlay ) ) );
            }
        } );
        // Switch to the last chosen one or first defined
        this.setCurrentBackground( this.storage.get( 'background' ) || 0 );
        // Update max bounds
        this.refreshMaxBounds();
        // Restore default view
        this.restoreDefaultView();

        for ( const groupName in this.config.groups ) {
            const group = this.config.groups[groupName];

            // Register with the layer manager
            this.layerManager.register( groupName );

            if ( Util.isBitSet( group.flags, Enums.MarkerGroupFlags.IsUnselected ) ) {
                this.layerManager.setExclusion( groupName, true );
            }
        }

        // Recalculate marker sizes when zoom ends
        this.leaflet.on( 'zoom', this.updateMarkerScaling, this );
        this.updateMarkerScaling();

        // Build extra controls
        this._buildControls();

        // Notify other components that the Leaflet component has been loaded, and remove all subscribers. All future
        // subscribers will be invoked right away.
        this.fireMemorised( 'leafletLoaded' );
    }


    _buildControls() {
        // Create a coordinate-under-cursor display
        if ( this.isFeatureBitSet( Enums.MapFlags.ShowCoordinates ) ) {
            this.$coordTracker = this.addControl( DataMap.anchors.bottomLeft,
                $( '<div class="leaflet-control datamap-control datamap-control-coords">' ) );
            this.leaflet.on( 'mousemove', event => {
                let lat = event.latlng.lat / this.crsScaleY;
                let lon = event.latlng.lng / this.crsScaleX;
                if ( this.crsOrigin == Enums.CRSOrigin.TopLeft )
                    lat = this.config.crs[1][0] - lat;
                this.$coordTracker.text( this.getCoordLabel( lat, lon ) );
            } );
        }

        // Create a background toggle
        if ( this.config.backgrounds.length > 1 ) {
            this.$backgroundSwitch = this.addControl( DataMap.anchors.topRight,
                $( '<select class="leaflet-control datamap-control datamap-control-backgrounds leaflet-bar">' )
                .on( 'change', () => {
                    // TODO: extract to setBackgroundPreference
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
        const $viewControls = this.addControl( DataMap.anchors.topLeft,
            $( '<div class="leaflet-control datamap-control leaflet-bar datamap-control-viewcontrols">' ) );
        $viewControls.append(
            $( '<a role="button" class="datamap-control-viewreset" aria-disabled="false"><span class="oo-ui-icon-fullScreen">'
                + '</span></a>' )
            .attr( {
                title: mw.msg( 'datamap-control-reset-view' ),
                'aria-label': mw.msg( 'datamap-control-reset-view' )
            } )
            .on( 'click', () => this.restoreDefaultView() )
        );
        $viewControls.append(
            $( '<a role="button" class="datamap-control-viewcentre" aria-disabled="false"><span class="oo-ui-icon-exitFullscreen">'
                + '</span></a>' )
            .attr( {
                title: mw.msg( 'datamap-control-centre-view' ),
                'aria-label': mw.msg( 'datamap-control-centre-view' )
            } )
            .on( 'click', () => this.centreView() )
        );
    }


    _initialiseLegend() {
        // Determine if we'll need a layer dropdown
        const hasCaves = this.isLayerUsed( 'cave' );
        const withLayerDropdown = hasCaves;

        // Initialise legend objects
        this.legend = new MapLegend( this );
        this.markerLegend = new MarkerLegendPanel( this.legend, mw.msg( 'datamap-legend-tab-locations' ), true, withLayerDropdown );

        // Build the surface and caves toggle
        // TODO: this should be gone by v0.15, preferably in v0.14 (though that one's going to be a 1.39 compat update)
        if ( hasCaves ) {
            this.markerLegend.addMarkerLayerToggleRequired( this.markerLegend.$layersPopup, 'cave', mw.msg( 'datamap-layer-surface' ) );
            this.markerLegend.addMarkerLayerToggleExclusive( this.markerLegend.$layersPopup, 'cave', mw.msg( 'datamap-layer-cave' ) );
        }

        // Build individual group toggles
        for ( const groupId in this.config.groups ) {
            if ( !this.dataSetFilters || this.dataSetFilters.indexOf( groupId ) >= 0 ) {
                this.markerLegend.addMarkerGroupToggle( groupId, this.config.groups[groupId] );
            }
        }
        // Set up the dismissable marker interactions
        if ( Object.values( this.config.groups ).some( x => Util.getGroupCollectibleType( x ) ) ) {
            this.legend.dismissables = new DismissableMarkersLegend( this.legend );
        }

        // Notify other components that the legend has been loaded, and remove all subscribers. All future subscribers
        // will be invoked right away.
        this.fireMemorised( 'leafletLoaded' );
    }
}


DataMap.anchors = {
    bottomLeft: '.leaflet-bottom.leaflet-left',
    topRight: '.leaflet-top.leaflet-right',
    topLeft: '.leaflet-top.leaflet-left'
};
DataMap.BOUNDS_PADDING = [ 150, 200 ];


module.exports = DataMap;