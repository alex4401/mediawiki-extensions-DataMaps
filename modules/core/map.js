const MapStorage = require( './storage.js' ),
    Enums = require( './enums.js' ),
    MarkerLayerManager = require( './layerManager.js' ),
    MarkerPopup = require( './popup.js' ),
    MarkerStreamingManager = require( './stream.js' ),
    LegendTabManager = require( './legend.js' ),
    MarkerFilteringPanel = require( './markerLegend.js' ),
    EventEmitter = require( './events.js' ),
    CollectiblesPanel = require( './dismissables.js' ),
    Util = require( './util.js' );
const MapFlags = Enums.MapFlags;
/** @type {!LeafletModule} */
// @ts-ignore: Lazily initialised, this'd be ideally solved with post-fix assertions but we're in JS land.
let Leaflet = null;


/**
 * A class that initialises, manages and represents a data map.
 */
class DataMap extends EventEmitter {
    /**
     * @param {number} id
     * @param {jQuery} $root
     * @param {DataMaps.Configuration.Map} config
     */
    constructor( id, $root, config ) {
        super();

        this.id = id;
        // Root DOM element of the data map
        this.$root = $root;
        /**
         * Setup configuration
         *
         * @type {DataMaps.Configuration.Map}
         */
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
        /**
         * Data set filters.
         *
         * @type {string[]?}
         */
        this.dataSetFilters = this.$root.data( 'filter-groups' ) || null;
        if ( this.dataSetFilters ) {
            this.dataSetFilters = this.dataSetFilters.split( '|' );
        }
        // DOM element to display any status messages
        this.$status = $root.find( '.datamap-status' );
        // LegendTabManager instance
        this.legend = null;
        /**
         * Leaflet instance. This field is unavailable before Leaflet is loaded.
         *
         * @type {!LeafletModule.Map}
         */
        // @ts-ignore: Lazily initialised. Ideally we'd suppress this with post-fix assertion, but we're not in TypeScript.
        this.leaflet = null;
        // Collection of Leaflet.Icons by group
        /** @deprecated Public access is deprecated since v0.14.0 */
        this.iconCache = {};
        // DOM element of the coordinates display control
        this.$coordTracker = null;
        // Cached value of the 'datamap-coordinate-control-text' message
        this.coordTrackingMsg = mw.msg( 'datamap-coordinate-control-text' );
        // Retrieve a `marker` parameter from the query string if one is present
        this.markerIdToAutoOpen = null;
        // Content bounds cache
        this._contentBounds = null;

        const $tabberPanel = Util.TabberNeue.getOwningPanel( this.$root );
        if ( $tabberPanel === null || mw.loader.getState( 'ext.tabberNeue' ) === 'ready' ) {
            this._setUpUriMarkerHandler();
        } else if ( $tabberPanel !== null ) {
            mw.loader.using( 'ext.tabberNeue', () => {
                this._setUpUriMarkerHandler();
            } );
        }

        // Coordinate reference system
        // If coordinate space spec is oriented [ lower lower upper upper ], assume top left corner as origin point (latitude
        // will be flipped). If [ upper upper lower lower ], assume bottom left corner (latitude will be unchanged). Any other
        // layout is invalid.
        if ( !this.config.crs ) {
            this.config.crs = [ [ 0, 0 ], [ 100, 100 ] ];
        }
        this.crsOrigin = ( this.config.crs[ 0 ][ 0 ] < this.config.crs[ 1 ][ 0 ]
            && this.config.crs[ 0 ][ 1 ] < this.config.crs[ 1 ][ 1 ] ) ? Enums.CRSOrigin.TopLeft : Enums.CRSOrigin.BottomLeft;
        // Y axis is authoritative, this is really just a cosmetic choice influenced by ARK (latitude first). X doesn't need to
        // be mapped on a separate scale from Y, unless we want them to always be squares.
        this.crsScaleX = this.crsScaleY = 100 / Math.max( this.config.crs[ 0 ][ 0 ], this.config.crs[ 1 ][ 0 ] );

        // Set up internal event handlers
        this.on( 'chunkStreamingDone', this.refreshMaxBounds, this );
        this.on( 'linkedEvent', this._onLinkedEventReceived, this );
        this.on( 'backgroundChange', this.refreshMaxBounds, this );
        this.on( 'markerVisibilityUpdate', this.refreshMaxBounds, this );
        this.on( 'legendManager', this._initialiseFiltersPanel, this );
        if ( !this.isFeatureBitSet( MapFlags.VisualEditor ) && Object.values( this.config.groups ).some( x =>
            Util.getGroupCollectibleType( x ) && !this.isLayerFilteredOut( x ) ) ) {
            this.on( 'legendManager', this._initialiseCollectiblesPanel, this );
        }

        // Request OOUI to be loaded and build the legend
        if ( !( !this.isFeatureBitSet( MapFlags.VisualEditor ) && this.isFeatureBitSet( MapFlags.HideLegend ) ) ) {
            mw.loader.using( [
                'oojs-ui-core',
                'oojs-ui-widgets'
            ], () => this._onOOUILoaded() );
        }

        // Prepare the Leaflet map view
        mw.loader.using( 'ext.datamaps.leaflet', () => {
            if ( Leaflet === null ) {
                Leaflet = Util.getLeaflet();
            }
            this._initialiseLeaflet( this.$root.find( '.datamap-holder' ) );
        } );

        // Load search add-on
        if ( !this.isFeatureBitSet( MapFlags.VisualEditor ) && this.isFeatureBitSet( MapFlags.Search ) ) {
            mw.loader.using( [
                'oojs-ui-core',
                'oojs-ui-widgets',
                'ext.datamaps.search'
            ] );
        }
    }


    /**
     * Checks if all bits of a mask are set on the configured flags constant.
     *
     * @param {number} mask Feature's bit mask.
     * @return {boolean}
     */
    isFeatureBitSet( mask ) {
        return Util.isBitSet( this.config.flags, mask );
    }


    _setUpUriMarkerHandler() {
        const tabberId = Util.TabberNeue.getOwningId( this.$root );
        if ( tabberId && tabberId !== window.location.hash.slice( 1 ) ) {
            return;
        }

        this.markerIdToAutoOpen = Util.getQueryParameter( 'marker' );
        this.on( 'markerReady', this.openPopupIfUriMarker, this );
    }


    /**
     * Runs the callback function when the Leaflet map is initialised. If you only need access to Leaflet's API, require module
     * `ext.datamaps.leaflet` instead with ResourceLoader.
     *
     * @param {Function} callback Function to run when Leaflet map is initialised.
     * @param {Object?} context Object to use as callback's context.
     *
     * @deprecated since version 0.14.3, to be removed in 0.15.0. Bind to the leafletLoaded event instead.
     */
    waitForLeaflet( callback, context ) {
        this.on( 'leafletLoaded', callback, context );
    }


    /**
     * Runs the callback function when the map legend is initialised.
     *
     * @param {Function} callback Function to run when the legend is initialised.
     * @param {Object?} context Object to use as callback's context.
     *
     * @deprecated since version 0.14.3, to be removed in 0.15.0. Bind to the markerFilteringPanel event instead.
     */
    waitForLegend( callback, context ) {
        this.on( 'markerFilteringPanel', callback, context );
    }


    /**
     * Returns true if a layer is used on the map. This is a look-up on the static configuration provided by the server, and does
     * not depend on any data being loaded.
     *
     * @param {string} name Name of the layer to check.
     * @return {boolean} Whether a layer is used.
     */
    isLayerUsed( name ) {
        return this.config.layerIds.indexOf( name ) >= 0;
    }


    /**
     * @param {string} name Name of the layer to check.
     * @return {boolean}
     */
    isLayerFilteredOut( name ) {
        return this.dataSetFilters && this.dataSetFilters.indexOf( name ) < 0 || false;
    }


    /**
     * Maps a point from map's coordinate reference system specified by the server, to the universal space [ 0 0 100 100 ].
     *
     * This is non-destructive, and clones the input.
     *
     * @param {DataMaps.PointTupleRepr} point Array with two number elements: X and Y coordinates.
     * @return {LeafletModule.PointTuple} New point in the universal space.
     */
    translatePoint( point ) {
        return this.crsOrigin === Enums.CRSOrigin.TopLeft
            ? [ ( this.config.crs[ 1 ][ 0 ] - point[ 0 ] ) * this.crsScaleY, point[ 1 ] * this.crsScaleX ]
            : [ point[ 0 ] * this.crsScaleY, point[ 1 ] * this.crsScaleX ];
    }


    /**
     * Maps a box from map's coordinate reference system specified by the server, to the universal space [ 0 0 100 100 ].
     *
     * This is non-destructive, and clones the input.
     *
     * @param {LeafletModule.LatLngBoundsTuple} box
     * @return {LeafletModule.LatLngBoundsTuple} New box in the universal space.
     */
    translateBox( box ) {
        return this.crsOrigin === Enums.CRSOrigin.TopLeft
            ? [ [ ( this.config.crs[ 1 ][ 0 ] - box[ 0 ][ 0 ] ) * this.crsScaleY, box[ 0 ][ 1 ] * this.crsScaleX ],
                [ ( this.config.crs[ 1 ][ 0 ] - box[ 1 ][ 0 ] ) * this.crsScaleY, box[ 1 ][ 1 ] * this.crsScaleX ] ]
            : [ [ box[ 0 ][ 0 ] * this.crsScaleY, box[ 0 ][ 1 ] * this.crsScaleX ],
                [ box[ 1 ][ 0 ] * this.crsScaleY, box[ 1 ][ 0 ] * this.crsScaleX ] ];
    }


    /**
     * Returns a formatted datamap-coordinate-control-text message.
     *
     * @param {DataMaps.PointTupleRepr|number} latOrInstance Latitude or API marker instance
     * @param {number?} [lon] Longitude if no instance specified.
     * @return {string}
     */
    getCoordLabel( latOrInstance, lon ) {
        if ( Array.isArray( latOrInstance ) ) {
            lon = latOrInstance[ 1 ];
            latOrInstance = latOrInstance[ 0 ];
        }

        const message = this.config.cOrder === 1 ? 'datamap-coordinate-control-text-xy' : 'datamap-coordinate-control-text';
        // @ts-ignore
        return mw.msg( message, latOrInstance.toFixed( 2 ), lon.toFixed( 2 ) );
    }


    /**
     * Returns global storage interface for global collectibles, local otherwise.
     *
     * @param {Object} group
     * @return {MapStorage}
     */
    getStorageForMarkerGroup( group ) {
        return Util.isBitSet( group.flags, Enums.MarkerGroupFlags.Collectible_GlobalGroup ) ? this.globalStorage : this.storage;
    }


    /**
     * Handles a event sent by another data map on this page. This is used for cross-communication. Sender map is exposed under
     * `event.map`.
     *
     * Message delivery is handled by the bootstrap itself, and not maps.
     *
     * @param {Object} event External event information.
     * @protected
     */
    _onLinkedEventReceived( event ) {
        switch ( event.type ) {
            /*
             * Sent when a global group's collected status changes. Data contains affected `groupId` and `state` after changed.
            */
            case 'groupDismissChange': {
                const group = this.config.groups[ event.groupId ];
                if ( group && Util.isBitSet( group.flags, Enums.MarkerGroupFlags.Collectible_GlobalGroup ) ) {
                    this._updateGlobalDismissal( event.groupId, event.state );
                }
                break;
            }
        }
    }


    /**
     * For a group, updates each marker's dismissal state and notifies other components (such as checklists). This may be called
     * either by natural/direct user interaction or a linked event.
     *
     * @param {string} groupId Identifier of a group to update.
     * @param {boolean} state Whether dismissed.
     * @protected
     */
    _updateGlobalDismissal( groupId, state ) {
        for ( const leafletMarker of this.layerManager.byLayer[ groupId ] ) {
            leafletMarker.setDismissed( state );
            this.fire( 'markerDismissChange', leafletMarker );
        }
        this.fire( 'groupDismissChange', groupId );
    }


    /**
     * Switches marker's (or its group's) collected status in storage, updates visuals, and notifies other components. In case of
     * global collectibles also fires a linked event to notify other maps on the page.
     *
     * @param {LeafletModule.CircleMarker|LeafletModule.Marker} leafletMarker
     * @return {boolean} New state.
     */
    toggleMarkerDismissal( leafletMarker ) {
        const groupId = leafletMarker.attachedLayers[ 0 ];
        const mode = Util.getGroupCollectibleType( this.config.groups[ groupId ] );
        const isIndividual = mode === Enums.MarkerGroupFlags.Collectible_Individual,
            storage = this.getStorageForMarkerGroup( this.config.groups[ groupId ] );
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
                    groupId,
                    state
                } );
            }
        }
        return state;
    }


    /*
     * Opens a marker's popup if the UID matches the `marker` query parameter
     */
    openPopupIfUriMarker( leafletMarker ) {
        if ( this.markerIdToAutoOpen !== null && Util.getMarkerId( leafletMarker ) === this.markerIdToAutoOpen ) {
            this.openMarkerPopup( leafletMarker );
            this.off( 'markerReady', this.openPopupIfUriMarker );
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
        if ( !this.iconCache[ markerType ] ) {
            const group = this.config.groups[ layers[ 0 ] ];

            if ( group.pinColor ) {
                this.iconCache[ markerType ] = new Leaflet.Ark.PinIcon( { colour: group.pinColor, iconSize: group.size } );
            } else {
                // Look for the first layer of this marker that has an icon override property
                let markerIcon = group.markerIcon;
                const override = layers.find( x => this.config.layers[ x ] && this.config.layers[ x ].markerIcon );
                if ( override ) {
                    markerIcon = this.config.layers[ override ].markerIcon;
                }

                this.iconCache[ markerType ] = new Leaflet.Icon( { iconUrl: markerIcon, iconSize: group.size } );
            }
        }
        return this.iconCache[ markerType ];
    }


    /**
     * Returns the class to be used for marker popup contents.
     *
     * @return {typeof MarkerPopup}
     */
    getPopupClass() {
        return MarkerPopup;
    }


    /**
     * Creates a Leaflet marker instance from information provided by the API: layers, and an array with latitude, longitude, and
     * optional data (the "state").
     *
     * Produces a `markerReady(Marker)` event. This event should be used sparingly whenever there's a possibility for a hot-path.
     *
     * @param {Array} layers
     * @param {DataMaps.ApiMarkerInstance} instance
     * @param {Object?} [properties]
     * @return {LeafletModule.CircleMarker|LeafletModule.Marker} A Leaflet marker instance.
     */
    createMarkerFromApiInstance( layers, instance, properties ) {
        const group = this.config.groups[ layers[ 0 ] ],
            position = this.translatePoint( instance );
        let leafletMarker;

        // Construct the marker
        if ( group.markerIcon || group.pinColor ) {
            // Fancy icon marker
            leafletMarker = new Leaflet.Ark.IconMarker( position, {
                icon: this.getIconFromLayers( layers )
            } );
        } else {
            // Circular marker
            leafletMarker = new Leaflet.Ark.CircleMarker( position, {
                radius: group.size / 2,
                /* TODO: rename config prop to zoomScaleFactor */
                zoomScaleFactor: group.extraMinZoomSize,
                fillColor: group.fillColor,
                fillOpacity: 0.7,
                color: group.strokeColor || group.fillColor,
                weight: group.strokeWidth || 1
            } );
        }

        // Initialise state if it's missing
        if ( !instance[ 2 ] ) {
            instance[ 2 ] = {};
        }

        // Persist original coordinates and state
        leafletMarker.apiInstance = instance;

        // Extract properties from the ownership string for quicker access
        if ( properties ) {
            leafletMarker.assignedProperties = properties;
        }

        // Add marker to the layer
        this.layerManager.addMember( layers, leafletMarker );

        // Update dismissal status if storage says it's been dismissed
        const collectibleMode = Util.getGroupCollectibleType( group );
        if ( collectibleMode ) {
            const isIndividual = collectibleMode === Enums.MarkerGroupFlags.Collectible_Individual,
                storage = this.getStorageForMarkerGroup( group );
            leafletMarker.setDismissed( storage.isDismissed( isIndividual ? Util.getMarkerId( leafletMarker ) : layers[ 0 ],
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
     *
     * @param {string[]} layers Array of string layer names.
     * @param {Array} position Point to place the marker at.
     * @param {Object?} [state] Optional object with fields: label, desc, image, article, search.
     * @param {Object?} [properties] Optional object with arbitrary fields.
     * @return {LeafletModule.CircleMarker|LeafletModule.Marker} Leaflet marker instance.
     */
    createMarker( layers, position, state, properties ) {
        return this.createMarkerFromApiInstance( layers, [ position[ 0 ], position[ 1 ], state ], properties );
    }


    /**
     * @param {LeafletModule.CircleMarker|LeafletModule.Marker} leafletMarker
     */
    openMarkerPopup( leafletMarker ) {
        const properties = leafletMarker.assignedProperties;
        if ( properties && properties.bg !== undefined ) {
            const backgroundIndex = this.config.backgrounds.findIndex( x => x.layer === properties.bg );
            if ( backgroundIndex >= -1 ) {
                this.setCurrentBackground( backgroundIndex );
            }
        }

        leafletMarker.openPopup();
    }


    /**
     * @param {number} index
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

        this.fire( 'backgroundChange', index, this.background );
    }


    /**
     * Updates map options regarding our custom marker scaling behaviour.
     */
    updateMarkerScaling() {
        const zoomPercent = Math.round( this.leaflet.getZoom() / this.leaflet.options.maxZoom * 100 ) / 100;
        this.leaflet.options.vecMarkerScale = zoomPercent * DataMap.VECTOR_ZOOM_SCALING_MAX;
        this.leaflet.options.iconMarkerScale = zoomPercent * DataMap.ICON_ZOOM_SCALING_MAX;
    }


    restoreDefaultView() {
        const originalSnap = this.leaflet.options.zoomSnap;
        this.leaflet.options.zoomSnap /= 4;
        this.leaflet.setZoom( this.leaflet.options.minZoom );
        this.leaflet.fitBounds( this.getCurrentContentBounds() );
        this.leaflet.options.zoomSnap = originalSnap;
    }


    centreView() {
        this.leaflet.setView( this.getCurrentContentBounds().getCenter() );
    }


    /**
     * Adds a custom control to Leaflet's container.
     *
     * Requires the Leaflet map to be initialised.
     *
     * @param {string} anchor Anchor selector (common ones are found in DataMap.anchors).
     * @param {jQuery} $element DOM node of the custom control.
     * @param {boolean} shouldPrepend Whether to add the control to the beginning of the anchor.
     * @return {jQuery} $element for chaining.
     */
    addControl( anchor, $element, shouldPrepend ) {
        if ( shouldPrepend && this.$legendPopupBtn ) {
            $element.insertAfter( this.$legendPopupBtn );
        } else {
            $element[ shouldPrepend ? 'prependTo' : 'appendTo' ]( this.$root.find( `.leaflet-control-container ${anchor}` ) );
        }

        // Stop mouse event propagation onto Leaflet map
        $element.on( 'click dblclick scroll mousewheel wheel', event => event.stopPropagation() );

        return $element;
    }


    /**
     * @param {Object} overlay
     * @return {Leaflet.Rectangle|Leaflet.Polyline|Leaflet.ImageOverlay}
     */
    buildBackgroundOverlayObject( overlay ) {
        let result;

        // Construct a layer
        if ( overlay.image ) {
            // Construct an image
            // eslint-disable-next-line es-x/no-array-string-prototype-at
            result = new Leaflet.ImageOverlay( overlay.image, this.translateBox( overlay.at ), {
                decoding: 'async',
                // Expand the DOM element's width and height by 0.5 pixels. This helps with gaps between tiles.
                antiAliasing: overlay.aa ? 0.5 : 0
            } );
        } else if ( overlay.path ) {
            // Construct a polyline
            result = new Leaflet.Polyline( overlay.path.map( p => this.translatePoint( p ) ), {
                color: overlay.colour || Leaflet.Path.prototype.options.color,
                weight: overlay.thickness || Leaflet.Path.prototype.options.weight
            } );
        } else {
            // Construct a rectangle
            // eslint-disable-next-line es-x/no-array-string-prototype-at
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
     * @param {number} index
     */
    setBackgroundPreference( index ) {
        this.setCurrentBackground( index );
        // Remember the choice
        this.storage.data.background = index;
        this.storage.commit();
    }


    /**
     * Calculates content bounds at a given moment from all of the map's contents (all geometrical layers are included). This is
     * uncached and fairly expensive.
     *
     * @param {boolean} invalidate Whether the bounds should be recalculated.
     * @return {LeafletModule.LatLngBounds}
     */
    getCurrentContentBounds( invalidate ) {
        if ( !invalidate || this._contentBounds === null ) {
            this._contentBounds = new Leaflet.LatLngBounds();
            // Extend with each layer's bounds
            for ( const id in this.leaflet._layers ) {
                const layer = this.leaflet._layers[ id ];
                if ( layer.getBounds || layer.getLatLng ) {
                    this._contentBounds.extend( layer.getBounds ? layer.getBounds() : layer.getLatLng() );
                }
            }
        }
        // Copy the cache into a new object
        return new Leaflet.LatLngBounds().extend( this._contentBounds );
    }


    /**
     * Calculates content bounds and includes extra padding around the area.
     *
     * @param {boolean} invalidate Whether the bounds should be recalculated.
     * @return {LeafletModule.LatLngBounds}
     */
    getPaddedContentBounds( invalidate ) {
        const bounds = this.getCurrentContentBounds( invalidate );
        const nw = bounds.getNorthWest(),
            se = bounds.getSouthEast();
        bounds.extend( [ [ se.lat - DataMap.BOUNDS_PADDING[ 0 ], se.lng + DataMap.BOUNDS_PADDING[ 1 ] ],
            [ nw.lat + DataMap.BOUNDS_PADDING[ 0 ], nw.lng - DataMap.BOUNDS_PADDING[ 1 ] ] ] );
        return bounds;
    }


    /**
     * Updates Leaflet's max view bounds to padded content bounds in current state. This is usually done
     * after a data chunk is streamed in, and is fairly expensive.
     */
    refreshMaxBounds() {
        const bounds = this.getPaddedContentBounds( true );
        this.leaflet.setMaxBounds( bounds );

        if ( this.leaflet.options.autoMinZoom ) {
            this.leaflet.options.minZoom = this.leaflet.options.autoMinZoomAbsolute;
            this.leaflet.setMinZoom( this.leaflet.getBoundsZoom( bounds, false, [ 0, 0 ] ) );
        }
    }


    _initialiseLeaflet( $holder ) {
        // If FF_DISABLE_ZOOM is set, prevent all kind of zooming
        if ( this.isFeatureBitSet( MapFlags.DisableZoom ) ) {
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
            wheelPxPerZoomLevel: 90,
            minZoom: Leaflet.Browser.mobile ? ( Leaflet.Browser.retina ? 1 : 1.75 ) : 2,
            // Zoom animation causes some awkward locking as Leaflet waits for the animation to finish before processing more
            // zoom requests, but disabling it causes some updates to be distorted (for example, the canvas renderer will drift).
            // We include a patch in our Leaflet builds to disable animations on desktop-style zooms.
            zoomAnimation: true,
            markerZoomAnimation: true,
            // Do not allow pinch-zooming to surpass max zoom even temporarily. This seems to cause a mispositioning.
            bounceAtZoomLimits: false,
            // Pan settings
            inertia: false,
            // Canvas renderer settings - using canvas for performance with padding of 1/3rd (to draw some more markers outside
            // of view for panning UX)
            preferCanvas: true,
            rendererSettings: {
                padding: 1 / 3
            },

            // Non-standard extended options
            // Automatic minimum zoom calculations
            autoMinZoom: true,
            autoMinZoomAbsolute: 0.05,
            // Zoom-based marker scaling
            shouldScaleMarkers: true,
            markerZoomScaleFactor: 1.8,
            // Zoom control text injection
            zoomControlOptions: {
                zoomInTitle: mw.msg( 'datamap-control-zoom-in' ),
                zoomOutTitle: mw.msg( 'datamap-control-zoom-out' )
            },

            // Enable bundled interaction rejection control
            interactionControl: true
        }, this.config.leafletSettings );
        // Specify the coordinate reference system and initialise the renderer
        leafletConfig.crs = Leaflet.CRS.Simple;
        leafletConfig.renderer = new Leaflet.Canvas( leafletConfig.rendererSettings );

        // Initialise the Leaflet map
        this.leaflet = new Leaflet.Map( $holder.get( 0 ), leafletConfig );

        // Prepare all backgrounds
        this.config.backgrounds.forEach( ( background, index ) => this._initialiseBackground( background, index ) );
        // Switch to the last chosen one or first defined
        this.setCurrentBackground( this.storage.data.background || 0 );
        // Update max bounds
        this.refreshMaxBounds();
        // Restore default view
        this.restoreDefaultView();

        for ( const groupName in this.config.groups ) {
            const group = this.config.groups[ groupName ];

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

        // Install the interaction rejection controller
        this.leaflet.addHandler( 'interactionControl', Leaflet.Ark.InteractionControl );

        // Notify other components that the Leaflet component has been loaded, and remove all subscribers. All future
        // subscribers will be invoked right away.
        this.fireMemorised( 'leafletLoaded' );
    }


    /**
     * @param {Object} background
     * @param {number} index
     * @private
     */
    _initialiseBackground( background, index ) {
        background.layers = [];

        // Set the associated layer name
        background.layer = background.layer || index;

        // Image overlay
        /* eslint-disable es-x/no-array-string-prototype-at */
        background.at = background.at || this.config.crs;
        if ( background.image ) {
            background.layers.push( new Leaflet.ImageOverlay( background.image, this.translateBox( background.at ), {
                decoding: 'async',
                // Expand the DOM element's width and height by 0.5 pixels. This helps with gaps between tiles.
                antiAliasing: 0.5
            } ) );
        }
        /* eslint-enable es-x/no-array-string-prototype-at */

        // Prepare overlay layers
        if ( background.overlays ) {
            background.overlays.forEach( overlay => background.layers.push(
                this.buildBackgroundOverlayObject( overlay ) ) );
        }
    }


    _makeControlButton( $parent, title, icon, cssClass ) {
        return $( `<a role="button" aria-disabled="false"><span class="oo-ui-icon-${icon}"></span></a>` )
            .attr( {
                title,
                'aria-label': title,
                class: cssClass
            } )
            .appendTo( $parent );
    }


    _buildControls() {
        // Create a button to toggle the legend on small screens
        this.$legendPopupBtn = this.addControl( DataMap.anchors.topLeft,
            $( '<div class="leaflet-control datamap-control leaflet-bar datamap-control-legend-toggle">' ), true );
        this._makeControlButton( this.$legendPopupBtn, mw.msg( 'datamap-legend-label' ), 'funnel' )
            .prepend( mw.msg( 'datamap-legend-label' ) )
            .on( 'click', event => {
                event.stopPropagation();
                this.$root.toggleClass( 'datamap-is-legend-toggled-on' );
                this.$legendPopupBtn.find( 'span' ).toggleClass( 'oo-ui-image-progressive' );
            } );

        // Create a coordinate-under-cursor display
        if ( this.isFeatureBitSet( MapFlags.ShowCoordinates ) ) {
            this.$coordTracker = this.addControl( DataMap.anchors.bottomLeft,
                $( '<div class="leaflet-control datamap-control datamap-control-coords">' ) );
            this.leaflet.on( 'mousemove', event => {
                let lat = event.latlng.lat / this.crsScaleY;
                const lon = event.latlng.lng / this.crsScaleX;
                if ( this.crsOrigin === Enums.CRSOrigin.TopLeft ) {
                    lat = this.config.crs[ 1 ][ 0 ] - lat;
                }
                this.$coordTracker.text( this.getCoordLabel( lat, lon ) );
            } );
        }

        // Create a background toggle
        if ( this.config.backgrounds.length > 1 ) {
            this.$backgroundSwitch = this.addControl( DataMap.anchors.topRight,
                $( '<select class="leaflet-control datamap-control datamap-control-backgrounds leaflet-bar">' )
                    .on( 'change', () => this.setBackgroundPreference( this.$backgroundSwitch.val() ) )
            );
            this.config.backgrounds.forEach( ( background, index ) => {
                $( '<option>' ).attr( 'value', index ).text( background.name ).appendTo( this.$backgroundSwitch );
            } );
            this.$backgroundSwitch.val( this.backgroundIndex );
            this.on( 'backgroundChange', () => {
                this.$backgroundSwitch.val( this.backgroundIndex );
            }, this );
        }

        // Extend zoom control to add buttons to reset or centre the view
        this.$viewControls = this.addControl( DataMap.anchors.topLeft,
            $( '<div class="leaflet-control datamap-control leaflet-bar datamap-control-viewcontrols">' ) );
        this._makeControlButton( this.$viewControls, mw.msg( 'datamap-control-reset-view' ), 'imageLayoutFrame',
            'datamap-control-viewreset' ).on( 'click', () => this.restoreDefaultView() );
        this._makeControlButton( this.$viewControls, mw.msg( 'datamap-control-centre-view' ), 'alignCenter',
            'datamap-control-viewcentre' ).on( 'click', () => this.centreView() );

        // Display an edit button for logged in users
        if ( !this.isFeatureBitSet( MapFlags.IsPreview ) && mw.config.get( 'wgUserName' ) !== null ) {
            this.$editControl = this.addControl( DataMap.anchors.topRight,
                $( '<div class="leaflet-control datamap-control leaflet-bar datamap-control-edit">' ) );
            const editLink = `${mw.util.wikiScript()}?curid=${this.id}&action=edit` + (
                mw.user.options.get( 'datamaps-enable-visual-editor' ) ? '&visual=1' : ''
            );
            this._makeControlButton( this.$editControl, mw.msg( 'datamap-control-edit' ), 'edit' )
                .attr( 'href', editLink );
        }
    }


    /**
     * @private
     */
    _onOOUILoaded() {
        this.legend = new LegendTabManager( this );
        this.fireMemorised( 'legendManager' );
    }


    /**
     * @private
     */
    _initialiseFiltersPanel() {
        // Determine if we'll need a layer dropdown
        const hasCaves = this.isLayerUsed( 'cave' );
        const withLayerDropdown = hasCaves;

        // Initialise legend objects
        this.filtersPanel = new MarkerFilteringPanel( this.legend, mw.msg( 'datamap-legend-tab-locations' ), true,
            withLayerDropdown );
        /* DEPRECATED(v0.14.0:v0.15.0) */
        this.markerLegend = this.filtersPanel;

        // Build the surface and caves toggle
        // TODO: this should be gone by v0.15, preferably in v0.14 (though that one's going to be a 1.39 compat update)
        if ( hasCaves ) {
            this.filtersPanel.addMarkerLayerToggleRequired( this.filtersPanel.$layersPopup, 'cave',
                mw.msg( 'datamap-layer-surface' ) );
            this.filtersPanel.addMarkerLayerToggleExclusive( this.filtersPanel.$layersPopup, 'cave',
                mw.msg( 'datamap-layer-cave' ) );
        }

        // Build individual group toggles
        this.filtersPanel.includeGroups( Object.keys( this.config.groups ).filter( x => !this.isLayerFilteredOut( x ) ) );

        // Notify other components that the legend has been loaded, and remove all subscribers. All future subscribers
        // will be invoked right away.
        this.fireMemorised( 'markerFilteringPanel' );
        /* DEPRECATED(v0.14.0:v0.15.0) */
        this.fireMemorised( 'legendLoaded' );
    }


    /**
     * @private
     */
    _initialiseCollectiblesPanel() {
        this.collectiblesPanel = new CollectiblesPanel( this.legend );
        this.fireMemorised( 'collectiblesPanel' );
    }
}


DataMap.anchors = {
    bottomLeft: '.leaflet-bottom.leaflet-left',
    topRight: '.leaflet-top.leaflet-right',
    topLeft: '.leaflet-top.leaflet-left'
};
DataMap.BOUNDS_PADDING = [ 150, 200 ];
DataMap.VECTOR_ZOOM_SCALING_MAX = 2.5;
DataMap.ICON_ZOOM_SCALING_MAX = 1;


module.exports = DataMap;
