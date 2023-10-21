const MapStorage = require( './storage.js' ),
    { MapFlags, MarkerGroupFlags, CRSOrigin } = require( './enums.js' ),
    MarkerLayerManager = require( './layerManager.js' ),
    MarkerPopup = require( './popup.js' ),
    MarkerStreamingManager = require( './stream.js' ),
    Controls = require( './controls.js' ),
    LegendTabber = require( './legend/tabber.js' ),
    MarkerFilteringPanel = require( './legend/filters.js' ),
    EventEmitter = require( './events.js' ),
    CollectiblesPanel = require( './legend/collectibles.js' ),
    Util = require( './util.js' ),
    { createDomElement } = Util;
/** @type {!LeafletModule} */
// @ts-ignore: Lazily initialised, this'd be ideally solved with post-fix assertions but we're in JS land.
let Leaflet = null;


/**
 * A class that initialises, manages and represents a data map.
 *
 * @extends EventEmitter<DataMaps.EventHandling.MapListenerSignatures>
 */
class DataMap extends EventEmitter {
    /**
     * @param {number} id
     * @param {HTMLElement} rootElement
     * @param {DataMaps.Configuration.Map} config
     */
    constructor( id, rootElement, config ) {
        super();

        /**
         * Page ID of the map source data.
         *
         * @type {number}
         */
        this.id = id;
        /**
         * Root DOM element of the data map.
         *
         * @type {HTMLElement}
         */
        this.rootElement = rootElement;
        /**
         * Setup configuration.
         *
         * @deprecated since 0.16.5; will be removed in 1.0.0. Alternatives will be made over the v0.16 cycle.
         * @type {DataMaps.Configuration.Map}
         */
        this.config = config;
        /**
         * Local map storage interface.
         *
         * @type {MapStorage}
         */
        this.storage = new MapStorage( this );
        /**
         * Global map storage interface.
         *
         * @type {MapStorage}
         */
        this.globalStorage = new MapStorage( this, 'global' );
        /**
         * Layer visibility manager.
         *
         * @type {MarkerLayerManager}
         */
        this.layerManager = new MarkerLayerManager( this );
        /**
         * Marker data streaming controller.
         *
         * @type {MarkerStreamingManager}
         */
        this.streaming = new MarkerStreamingManager( this );
        /**
         * Current background information.
         *
         * @type {DataMaps.Configuration.Background?}
         */
        this.background = null;
        /**
         * Current background index.
         *
         * @type {number}
         */
        this.backgroundIndex = 0;
        /**
         * Data set filters.
         *
         * @type {string[]?}
         */
        this.dataSetFilters = this.rootElement.dataset.filterGroups ? this.rootElement.dataset.filterGroups.split( '|' ) : null;
        /**
         * DOM element to display any status messages.
         *
         * @type {HTMLElement}
         */
        this.statusElement = /** @type {HTMLElement} */ ( Util.getNonNull( rootElement.querySelector(
            '.ext-datamaps-container-status' ) ) );
        /**
         * Instance of the tab manager in the legend. Only initialised when legend is done loading, if it's enabled.
         *
         * @type {LegendTabber?}
         */
        this.legend = null;
        /**
         * Leaflet instance. This field is unavailable before Leaflet is loaded.
         *
         * @type {!LeafletModule.Map}
         */
        // @ts-ignore: Lazily initialised. Ideally we'd suppress this with post-fix assertion, but we're not in TypeScript.
        this.leaflet = null;
        /**
         * Collection of Leaflet.Icons by group.
         *
         * @private
         * @type {Record<string, LeafletModule.Icon>}
         */
        this._iconCache = {};
        /**
         * DOM element of the coordinates display control.
         *
         * @type {Controls.ExtraViewControls?}
         */
        this.extraViewControls = null;
        /**
         * DOM element of the coordinates display control.
         *
         * @type {Controls.Coordinates?}
         */
        this.coordTracker = null;
        /**
         * DOM element of the edit button shown to registered users.
         *
         * @type {Controls.EditButton?}
         */
        this.editControl = null;
        /**
         * DOM element of the background switcher dropdown.
         *
         * @type {Controls.BackgroundSwitcher?}
         */
        this.backgroundSwitch = null;
        /**
         * Content bounds cache.
         *
         * @type {LeafletModule.LatLngBounds?}
         */
        this._contentBounds = null;
        /**
         * @private
         * @type {HTMLElement}
         */
        this._legendElement = null;
        /**
         * @type {HTMLElement?}
         */
        this._fullScreenAnchor = null;

        this._setUpUriMarkerHandler();

        /**
         * Coordinate origin.
         *
         * @type {DataMaps.CoordinateOrigin}
         */
        this.crsOrigin = ( this.config.crs[ 0 ][ 0 ] < this.config.crs[ 1 ][ 0 ]
            && this.config.crs[ 0 ][ 1 ] < this.config.crs[ 1 ][ 1 ] ) ? CRSOrigin.TopLeft : CRSOrigin.BottomLeft;
        /**
         * Coordinate system rotation.
         *
         * @type {number}
         */
        this._crsAngle = this.config.cRot || 0;
        this._crsRotS = Math.sin( -this._crsAngle );
        this._crsRotC = Math.cos( -this._crsAngle );
        this._crsRotSInv = Math.sin( this._crsAngle );
        this._crsRotCInv = Math.cos( this._crsAngle );
        // Y axis is authoritative, this is really just a cosmetic choice influenced by ARK (latitude first). X doesn't need to
        // be mapped on a separate scale from Y, unless we want them to always be squares.
        /**
         * Coordinate scale value. Prefer `translateBox` and `translatePoint` over manual calculations.
         *
         * @type {number}
         */
        this.crsScaleX = this.crsScaleY = 100 / Math.max( this.config.crs[ 0 ][ 0 ], this.config.crs[ 1 ][ 0 ] );

        // Force the IconRenderer_Canvas flag if dmfullcanvas in the URL
        if ( Util.getQueryParameter( 'dmfullcanvas' ) ) {
            this.config.flags = this.config.flags | MapFlags.IconRenderer_Canvas;
        }

        // Register groups from the configuration with the layer visibility manager, and set their default state
        for ( const groupName in this.config.groups ) {
            const group = this.config.groups[ groupName ];

            // Register with the layer manager
            this.layerManager.register( groupName );

            if ( Util.isBitSet( group.flags, MarkerGroupFlags.IsUnselected ) ) {
                this.layerManager.setExclusion( groupName, true );
            }
        }

        // Set up internal event handlers
        this.on( 'chunkStreamingDone', this.refreshMaxBounds, this );
        this.on( 'linkedEvent', this._onLinkedEventReceived, this );
        this.on( 'backgroundChange', this.refreshMaxBounds, this );
        this.on( 'markerVisibilityUpdate', this.refreshMaxBounds, this );
        this.on( 'legendManager', this._initialiseFiltersPanel, this );
        if ( !this.isFeatureBitSet( MapFlags.VisualEditor ) && Object.values( this.config.groups ).some( x =>
            Util.Groups.getCollectibleType( x ) ) ) {
            this.on( 'legendManager', this._initialiseCollectiblesPanel, this );
        }

        // Request OOUI to be loaded and build the legend
        if ( !( !this.isFeatureBitSet( MapFlags.VisualEditor ) && this.isFeatureBitSet( MapFlags.HideLegend ) ) ) {
            mw.loader.using( [
                'oojs-ui-core',
                'oojs-ui-widgets'
            ], () => this.on( 'leafletLoaded', this._onOOUILoaded, this ) );
        }

        // Prepare the Leaflet map view
        mw.loader.using( 'ext.datamaps.leaflet', () => {
            if ( Leaflet === null ) {
                Leaflet = Util.getLeaflet();
            }
            this._initialiseLeaflet( /** @type {HTMLElement} */ ( Util.getNonNull( this.rootElement.querySelector(
                '.ext-datamaps-container-leaflet' ) ) ) );
        } );

        // Load search add-on
        if ( !this.isFeatureBitSet( MapFlags.VisualEditor ) && this.isFeatureBitSet( MapFlags.Search ) ) {
            mw.loader.using( [
                'oojs-ui-core',
                'oojs-ui-widgets',
                'ext.datamaps.search'
            ] );
        }

        // TODO: in GH#165, fire this after API returns the config
        if ( this.config.custom ) {
            this.fireMemorised( 'customData', this.config.custom );
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


    /**
     * @param {null|'info'|'error'} severity
     * @param {string} [html]
     * @param {boolean} [showProgressBar]
     */
    setStatusOverlay( severity, html, showProgressBar ) {
        this.statusElement.dataset.severity = severity || 'info';
        this.statusElement.style.display = severity ? 'block' : 'none';
        if ( html ) {
            this.statusElement.children[ 1 ].innerHTML = html;
        }
        if ( showProgressBar !== undefined ) {
            /** @type {HTMLElement} */ ( this.statusElement.children[ 0 ] ).style.display = showProgressBar ? 'block' : 'none';
        }
    }


    /**
     * @private
     */
    _setUpUriMarkerHandler() {
        const idToOpen = Util.getQueryParameter( 'marker' );
        if ( !idToOpen ) {
            return;
        }

        // If in a tabber and TabberNeue is not loaded yet, wait for it. We can't efficiently make any guarantees about
        // the ID until then.
        const tabberId = Util.TabberNeue.getOwningId( this.rootElement );
        if ( tabberId !== null && mw.loader.getState( Util.TabberNeue.module ) !== 'ready' ) {
            mw.loader.using( Util.TabberNeue.module, () => this._setUpUriMarkerHandler() );
        }

        // If in a tabber, check if the hash location matches
        if ( tabberId && tabberId !== window.location.hash.slice( 1 ) ) {
            return;
        }

        // Listen to incoming markers and wait for a matching one
        const handler = /** @type {DataMaps.EventHandling.MapListenerSignatures['markerReady']} */ ( leafletMarker => {
            const mId = Util.getMarkerId( leafletMarker );
            // Check both exact match and match with an `M` prefix for legacy pre-v0.16 link support
            if ( mId === idToOpen || `M${mId}` === idToOpen ) {
                this.openMarkerPopup( leafletMarker, true );
                this.off( 'markerReady', handler, this );
            }
        } );
        this.on( 'markerReady', handler, this );
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
     * @param {boolean} value 
     */
    setFullScreen( value ) {
        if ( value && this._fullScreenAnchor === null ) {
            // Turn fullscreen on
            this._fullScreenAnchor = Util.createDomElement( 'div', {
                classes: [ 'ext-datamaps-map-anchor' ]
            } );
            Util.getNonNull( this.rootElement.parentNode ).insertBefore( this._fullScreenAnchor, this.rootElement );
            this.rootElement.classList.add( 'ext-datamaps-is-fullscreen' );
            document.body.appendChild( this.rootElement );

            if ( this.leaflet.interactionControl ) {
                this.leaflet.interactionControl.disable();
            }
        } else if ( !value && this._fullScreenAnchor ) {
            // Turn fullscren off
            Util.getNonNull( this._fullScreenAnchor.parentNode ).replaceChild( this.rootElement, this._fullScreenAnchor );
            this.rootElement.classList.remove( 'ext-datamaps-is-fullscreen' );
            this._fullScreenAnchor = null;

            if ( this.leaflet.interactionControl ) {
                this.leaflet.interactionControl.enable();
            }
        }
    }


    /**
     * @return {boolean}
     */
    isFullScreen() {
        return this._fullScreenAnchor !== null;
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
        const
            y = (
                this.crsOrigin === CRSOrigin.TopLeft ? ( this.config.crs[ 1 ][ 0 ] - point[ 0 ] ) : point[ 0 ]
            ) * this.crsScaleY,
            x = point[ 1 ] * this.crsScaleX;
        return [ x * this._crsRotS + y * this._crsRotC, x * this._crsRotC - y * this._crsRotS ];
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
        return this.crsOrigin === CRSOrigin.TopLeft
            ? [ [ ( this.config.crs[ 1 ][ 0 ] - box[ 0 ][ 0 ] ) * this.crsScaleY, box[ 0 ][ 1 ] * this.crsScaleX ],
                [ ( this.config.crs[ 1 ][ 0 ] - box[ 1 ][ 0 ] ) * this.crsScaleY, box[ 1 ][ 1 ] * this.crsScaleX ] ]
            : [ [ box[ 0 ][ 0 ] * this.crsScaleY, box[ 0 ][ 1 ] * this.crsScaleX ],
                [ box[ 1 ][ 0 ] * this.crsScaleY, box[ 1 ][ 0 ] * this.crsScaleX ] ];
    }


    /**
     * @param {LeafletModule.LatLng} latlng
     * @param {boolean} [round=false]
     * @return {DataMaps.PointTupleRepr}
     */
    translateLeafletCoordinates( latlng, round ) {
        let lat = latlng.lat / this.crsScaleY,
            lon = latlng.lng / this.crsScaleX;
        if ( this.crsOrigin === CRSOrigin.TopLeft ) {
            lat = this.config.crs[ 1 ][ 0 ] - lat;
        }

        if ( this._crsAngle ) {
            [ lat, lon ] = [
                lon * this._crsRotSInv + lat * this._crsRotCInv,
                lon * this._crsRotCInv - lat * this._crsRotSInv
            ];
        }

        if ( round ) {
            lat = Math.round( lat * 10e3 ) / 10e3;
            lon = Math.round( lon * 10e3 ) / 10e3;
        }

        return [ lat, lon ];
    }


    /**
     * Returns a formatted datamap-coordinate-control-text message.
     *
     * @param {DataMaps.PointTupleRepr|number|LeafletModule.LatLng} latOrInstance Latitude or API marker instance
     * @param {number?} [lon] Longitude if no instance specified.
     * @return {string}
     */
    getCoordinateLabel( latOrInstance, lon ) {
        let /** @type {number} */ lat;
        if ( Array.isArray( latOrInstance ) ) {
            [ lat, lon ] = latOrInstance;
        } else if ( latOrInstance instanceof Leaflet.LatLng ) {
            [ lat, lon ] = this.translateLeafletCoordinates( latOrInstance );
        } else {
            lat = latOrInstance;
        }

        const message = this.config.cOrder === 1 ? 'datamap-coordinate-control-text-xy' : 'datamap-coordinate-control-text';
        return mw.msg( message, lat.toFixed( 2 ), /** @type {number} */ ( lon ).toFixed( 2 ) );
    }


    /**
     * Returns a formatted datamap-coordinate-control-text message.
     *
     * @deprecated since v0.16.0, will be removed in v1.0.0. Use {@link getCoordinateLabel}.
     * @param {DataMaps.PointTupleRepr|number} latOrInstance Latitude or API marker instance
     * @param {number?} [lon] Longitude if no instance specified.
     * @return {string}
     */
    getCoordLabel( latOrInstance, lon ) {
        return this.getCoordinateLabel( latOrInstance, lon );
    }


    /**
     * Returns global storage interface for global collectibles, local otherwise.
     *
     * @param {DataMaps.Configuration.MarkerGroup} group
     * @return {MapStorage}
     */
    getStorageForMarkerGroup( group ) {
        return Util.isBitSet( group.flags, MarkerGroupFlags.Collectible_GlobalGroup ) ? this.globalStorage : this.storage;
    }


    /**
     * Handles a event sent by another data map on this page. This is used for cross-communication. Sender map is exposed under
     * `event.map`.
     *
     * Message delivery is handled by the bootstrap itself, and not maps.
     *
     * @protected
     * @param {DataMaps.EventHandling.Linked.Event} event External event information.
     */
    _onLinkedEventReceived( event ) {
        switch ( event.type ) {
            // Sent when a global group's collected status changes. Data contains affected `groupId` and `state` after
            // changed.
            case 'groupDismissChange': {
                const gdeEvent = /** @type {DataMaps.EventHandling.Linked.IGroupDismissChangeEvent} */ ( event );
                const group = this.config.groups[ gdeEvent.groupId ];
                if ( group && Util.isBitSet( group.flags, MarkerGroupFlags.Collectible_GlobalGroup ) ) {
                    this._updateGlobalDismissal( gdeEvent.groupId, gdeEvent.state );
                }
                break;
            }
        }
    }


    /**
     * For a group, updates each marker's dismissal state and notifies other components (such as checklists). This may be called
     * either by natural/direct user interaction or a linked event.
     *
     * @protected
     * @param {string} groupId Identifier of a group to update.
     * @param {boolean} state Whether dismissed.
     * @fires DataMap#markerDismissChange For each updated marker.
     * @fires DataMap#groupDismissChange For the group.
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
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @fires DataMap#markerDismissChange For the marker if it's an individual collectible.
     * @fires DataMap#sendLinkedEvent (groupDismissChange) When a group has its status updated instead.
     * @return {boolean} New state.
     */
    toggleMarkerDismissal( leafletMarker ) {
        const groupId = leafletMarker.attachedLayers[ 0 ],
            mode = Util.Groups.getCollectibleType( this.config.groups[ groupId ] ),
            isIndividual = mode === MarkerGroupFlags.Collectible_Individual,
            storage = this.getStorageForMarkerGroup( this.config.groups[ groupId ] ),
            state = storage.toggleDismissal( isIndividual ? Util.getMarkerId( leafletMarker ) : groupId, !isIndividual );
        if ( isIndividual ) {
            // Update this marker only
            leafletMarker.setDismissed( state );
            this.fire( 'markerDismissChange', leafletMarker );
        } else {
            this._updateGlobalDismissal( groupId, state );
            // If global, broadcast an event to other maps on this page
            if ( mode === MarkerGroupFlags.Collectible_GlobalGroup ) {
                this.fire( 'sendLinkedEvent', {
                    type: 'groupDismissChange',
                    groupId,
                    state
                } );
            }
        }
        return state;
    }


    /**
     * Opens a marker's popup if the UID matches the `marker` query parameter
     *
     * @deprecated since 0.16.7, will be removed in 0.17.0; this function does nothing, behaviour inlined.
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    openPopupIfUriMarker( leafletMarker ) {}


    /**
     * Returns a Leaflet icon object for marker layers. All access is cached.
     *
     * Group icon is used if there is no layer overriding it. However, if there is one, first such layer is used and rest are
     * discarded.
     *
     * @param {string[]} layers
     * @return {LeafletModule.Icon}
     */
    getIconFromLayers( layers ) {
        const markerType = layers.join( ' ' );
        // Construct the object if not found in cache
        if ( !this._iconCache[ markerType ] ) {
            const group = /** @type {DataMaps.Configuration.IconBasedMarkerGroup} */ ( this.config.groups[ layers[ 0 ] ] );

            if ( 'pinColor' in group ) {
                this._iconCache[ markerType ] = new Leaflet.Ark.PinIcon( {
                    colour: group.pinColor,
                    strokeColour: group.strokeColor || '#fffa',
                    strokeWidth: group.strokeWidth || 0.5,
                    iconSize: group.size,
                    // Pin markers are currently not supported by canvas renderer
                    useWithCanvas: false
                } );
            } else if ( 'markerIcon' in group ) {
                // Look for the first layer of this marker that has an icon override property
                let markerIcon = group.markerIcon;
                const override = layers.find( x => this.config.layers[ x ] && this.config.layers[ x ].markerIcon );
                if ( override ) {
                    markerIcon = Util.getNonNull( this.config.layers[ override ].markerIcon );
                }

                this._iconCache[ markerType ] = new Leaflet.Icon( {
                    iconUrl: markerIcon,
                    iconSize: group.size,
                    useWithCanvas: this.shouldRenderIconsOnCanvas()
                } );
            }
        }
        return this._iconCache[ markerType ];
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
     * Returns whether icon markers may be rendered onto a canvas.
     *
     * @return {boolean}
     */
    shouldRenderIconsOnCanvas() {
        return this.isFeatureBitSet( MapFlags.IconRenderer_Canvas );
    }


    /**
     * Creates a Leaflet marker instance from information provided by the API: layers, and an array with latitude, longitude, and
     * optional data (the "state").
     *
     * Produces a `markerReady(Marker)` event. This event should be used sparingly whenever there's a possibility for a hot-path.
     *
     * @param {string[]} layers
     * @param {DataMaps.UncheckedApiMarkerInstance} uncheckedInstance
     * @param {DataMaps.RuntimeMarkerProperties?} [properties]
     * @fires DataMap#modifyMarkerOptions
     * @fires DataMap#markerReady
     * @return {LeafletModule.AnyMarker} A Leaflet marker instance.
     */
    createMarkerFromApiInstance( layers, uncheckedInstance, properties ) {
        // Initialise state if it's missing, thus reaching a null-safe state
        if ( !uncheckedInstance[ 2 ] ) {
            uncheckedInstance[ 2 ] = {};
        }

        const instance = /** @type {DataMaps.ApiMarkerInstance} */ ( uncheckedInstance ),
            group = this.config.groups[ layers[ 0 ] ],
            position = this.translatePoint( instance );

        // Construct the marker
        let /** @type {LeafletModule.AnyMarker|undefined} */ leafletMarker;
        if ( 'markerIcon' in group || 'pinColor' in group ) {
            // Fancy icon marker
            const shouldUseCanvas = !( 'pinColor' in group ) && this.shouldRenderIconsOnCanvas(),
                Cls = shouldUseCanvas ? Leaflet.CanvasIconMarker : Leaflet.Marker,
                icon = (
                    'markerIcon' in group && instance[ 2 ].icon
                        ? new Leaflet.Icon( {
                            iconUrl: instance[ 2 ].icon,
                            iconSize: group.size,
                            useWithCanvas: this.shouldRenderIconsOnCanvas()
                        } )
                        : this.getIconFromLayers( layers )
                ),
                markerOptions = { icon };
            this.fire( 'modifyMarkerOptions', Cls, instance, markerOptions );
            leafletMarker = new Cls( position, markerOptions );
        } else {
            // Circular marker
            const Cls = Leaflet.CircleMarker,
                markerOptions = {
                    radius: group.size / 2,
                    zoomScaleFactor: group.zoomScaleFactor,
                    fillColor: group.fillColor,
                    fillOpacity: 0.7,
                    color: group.strokeColor || group.fillColor,
                    weight: group.strokeWidth || 1
                };
            this.fire( 'modifyMarkerOptions', Cls, instance, markerOptions );
            leafletMarker = new Cls( position, markerOptions );
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
        const collectibleMode = Util.Groups.getCollectibleType( group );
        if ( collectibleMode ) {
            const isIndividual = collectibleMode === MarkerGroupFlags.Collectible_Individual,
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
     * @param {LeafletModule.PointTuple} position Point to place the marker at.
     * @param {DataMaps.IApiMarkerSlots?} [state] Optional object with fields: label, desc, image, article, search.
     * @param {DataMaps.RuntimeMarkerProperties?} [properties] Optional object with arbitrary fields.
     * @return {LeafletModule.AnyMarker} Leaflet marker instance.
     */
    createMarker( layers, position, state, properties ) {
        return this.createMarkerFromApiInstance( layers, [ position[ 0 ], position[ 1 ], state || null ], properties );
    }


    /**
     * Opens a marker's popup, while respecting its background ties.
     *
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @param {boolean} [centreMapOver]
     */
    openMarkerPopup( leafletMarker, centreMapOver ) {
        const properties = leafletMarker.assignedProperties;
        if ( properties && properties.bg !== undefined ) {
            const backgroundIndex = this.config.backgrounds.findIndex( x => x.layer === properties.bg );
            if ( backgroundIndex >= -1 ) {
                this.setCurrentBackground( backgroundIndex );
            }
        }

        leafletMarker.openPopup();

        if ( centreMapOver && this.leaflet.options.uriPopupZoom !== false ) {
            this.leaflet.flyTo( leafletMarker.getLatLng(), this.leaflet.options.uriPopupZoom
                || ( this.leaflet.options.maxZoom - this.leaflet.options.minZoom ) / 5 * 4 );
        }
    }


    /**
     * Changes currently shown background without affecting the user preference.
     *
     * @param {number} index
     * @fires DataMap#backgroundChange
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
        for ( const layer of this.background.layers ) {
            layer.addTo( this.leaflet );
            layer.bringToBack();
        }

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


    /**
     * Snaps the viewport to the content. Zooms out entirely on a double click.
     */
    restoreDefaultView() {
        this.leaflet.setZoom( this.leaflet.options.minZoom ).fitBounds( this.getCurrentContentBounds(), {
            paddingTopLeft: [ this.getMapOffsetWidth(), 0 ]
        } );
    }


    /**
     * Moves the viewport to the centre of the content bounds without affecting zoom.
     */
    centreView() {
        this.leaflet.setView( this.getCurrentContentBounds().getCenter() );
    }


    /**
     * @private
     * @param {DataMaps.Configuration.BackgroundOverlay} overlay
     * @return {LeafletModule.Rectangle|LeafletModule.Polyline|LeafletModule.ImageOverlay}
     */
    _buildBackgroundOverlayObject( overlay ) {
        let result;

        // Construct a layer
        if ( overlay.image ) {
            // Construct an image
            result = new Leaflet.ImageOverlay( overlay.image, this.translateBox( overlay.at ), {
                className: overlay.pixelated ? 'ext-datamaps-pixelated-image' : undefined,
                decoding: 'async',
                // Expand the DOM element's width and height by 0.51 pixels. This helps with gaps between tiles.
                antiAliasing: overlay.aa ? 0.51 : 0
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
     * Changes currently shown background and updates user preferences.
     *
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
     * @param {boolean} [invalidate] Whether the bounds should be recalculated.
     * @return {LeafletModule.LatLngBounds}
     */
    getCurrentContentBounds( invalidate ) {
        if ( !invalidate || this._contentBounds === null ) {
            this._contentBounds = new Leaflet.LatLngBounds();
            // Extend with each layer's bounds
            for ( const id in this.leaflet._layers ) {
                const layer = this.leaflet._layers[ id ];

                if ( 'getBounds' in layer ) {
                    let layerBounds = /** @type {LeafletModule.IHasBoundsGetter} */ ( layer ).getBounds();
                    if ( this._crsAngle ) {
                        for ( const [ a, b ] of [
                            [ layerBounds._southWest, layerBounds._northEast ],
                            [ layerBounds.getSouthEast(), layerBounds.getNorthWest() ]
                        ] ) {
                            layerBounds = new Leaflet.LatLngBounds(
                                [ a.lng * this._crsRotS + a.lat * this._crsRotC, a.lng * this._crsRotC - a.lat * this._crsRotS ],
                                [ b.lng * this._crsRotS + b.lat * this._crsRotC, b.lng * this._crsRotC - b.lat * this._crsRotS ]
                            );
                        }
                    }
                    this._contentBounds.extend( layerBounds );
                } else if ( layer.getLatLng ) {
                    this._contentBounds.extend( layer.getLatLng() );
                }
            }
        }
        // Copy the cache into a new object
        return new Leaflet.LatLngBounds().extend( this._contentBounds );
    }


    /**
     * @return {number}
     */
    getMapOffsetWidth() {
        const viewportWidth = document.documentElement.clientWidth;
        if (
            this.isFeatureBitSet( MapFlags.HideLegend )
            // Check if viewport width is within our frame
            || viewportWidth < DataMap.LEGEND_AFFECTS_BOUNDS_FIT_VIEWPORT_WIDTH[ 0 ]
            || viewportWidth > DataMap.LEGEND_AFFECTS_BOUNDS_FIT_VIEWPORT_WIDTH[ 1 ]
            // Check the groups threshold. Ideally we'd check legend's height here, but it may not have been loaded yet.
            || Object.keys( this.config.groups ).length < DataMap.LEGEND_MINIMUM_GROUPS_TO_OFFSET_VIEWPORT
            // Do not offset if legend is collapsed
            || ( this.legend && !this.legend.isExpanded() )
        ) {
            return 0;
        }
        return this._legendElement.offsetWidth;
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
        bounds.extend( [
            [ se.lat - DataMap.BOUNDS_PADDING[ 0 ][ 0 ], se.lng + DataMap.BOUNDS_PADDING[ 0 ][ 1 ] ],
            [ nw.lat + DataMap.BOUNDS_PADDING[ 1 ][ 0 ], nw.lng - DataMap.BOUNDS_PADDING[ 1 ][ 1 ] ]
        ] );
        return bounds;
    }


    /**
     * Updates Leaflet's max view bounds to padded content bounds in current state. This is usually done after a data chunk is
     * streamed in, and is fairly expensive.
     */
    refreshMaxBounds() {
        const bounds = this.getPaddedContentBounds( true );
        this.leaflet.setMaxBounds( bounds );

        if ( this.leaflet.options.autoMinZoom ) {
            this.leaflet.options.minZoom = this.leaflet.options.autoMinZoomAbsolute;
            this.leaflet.setMinZoom( this.leaflet.getBoundsZoom( bounds, false, [ 0, 0 ] ) );
            // TODO: this should recalculate popup zoom?
        }
    }


    /**
     * @private
     * @return {LeafletModule.MapOptions}
     */
    _makeLeafletConfig() {
        // Ensure the `zoom` section of the config is initialised
        if ( !this.config.zoom ) {
            this.config.zoom = {
                min: 0.05,
                lock: this.isFeatureBitSet( MapFlags.DisableZoom ),
                max: 6,
                auto: true
            };
        }

        // Disable automated minimum zoom calculation if the value has been specified in custom Leaflet settings
        // TODO: legacy behaviour, drop in v0.17
        if ( 'minZoom' in ( this.config.leafletSettings || {} ) ) {
            this.config.zoom.auto = false;
        }

        // If zoom is locked, disable all zoom controls
        if ( this.config.zoom.lock ) {
            this.config.leafletSettings = $.extend( {
                zoomControl: false,
                boxZoom: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                touchZoom: false
            }, this.config.leafletSettings || {} );
        }

        // Prepare settings for Leaflet
        /** @type {LeafletModule.MapOptions} */
        const result = $.extend( true, /** @type {LeafletModule.IPublicMapOptions} */ ( {
            // Boundaries
            center: [ 50, 50 ],
            maxBounds: [ [ -100, -100 ], [ 200, 200 ] ],
            maxBoundsViscosity: 0.7,
            // Zoom settings
            zoomSnap: 0,
            zoomDelta: 0.25,
            wheelPxPerZoomLevel: 90,
            maxZoom: this.config.zoom.max,
            minZoom: this.config.zoom.min,
            // Zoom animations cause some awkward locking as Leaflet waits for the animation to finish before processing more
            // zoom requests.
            // However, before v0.15.0 they had to be enabled to mitigate vector drift, which has been since fixed by Leaflet's
            // PR#8794. Before that merge request we had explicitly called zoom in desktop handlers with animations turned off.
            zoomAnimation: false,
            markerZoomAnimation: true,
            // Do not allow pinch-zooming to surpass max zoom even temporarily. This seems to cause a mispositioning.
            bounceAtZoomLimits: false,
            // Pan settings
            inertia: false,
            // Canvas renderer settings - using canvas for performance with padding of 1/3rd (to draw some more markers outside
            // of view for panning UX)
            rendererSettings: {
                padding: 1 / 3
            },

            // Non-standard extended options
            // Automatic minimum zoom calculations
            autoMinZoom: this.config.zoom.auto,
            // TODO: merge into minZoom
            autoMinZoomAbsolute: this.config.zoom.min,
            // Zoom-based marker scaling
            shouldScaleMarkers: true,
            markerZoomScaleFactor: 1.8,
            // Zoom control
            zoomControlOptions: {
                position: 'topright',
                zoomInTitle: mw.msg( 'datamap-control-zoom-in' ),
                zoomOutTitle: mw.msg( 'datamap-control-zoom-out' )
            },
            // Allow rendering icon markers on a canvas
            allowIconsOnCanvas: true,

            // Enable bundled interaction rejection control
            interactionControl: true
        } ), this.config.leafletSettings );

        return result;
    }


    /**
     * @private
     * @param {HTMLElement} holderElement Container for the Leaflet map.
     * @fires DataMap#leafletLoaded
     * @fires DataMap#leafletLoadedLate
     */
    _initialiseLeaflet( holderElement ) {
        const leafletConfig = this._makeLeafletConfig();
        // Specify the coordinate reference system and initialise the renderer
        leafletConfig.crs = Leaflet.CRS.Simple;
        leafletConfig.renderer = new Leaflet.Canvas( leafletConfig.rendererSettings );
        // Initialise the Leaflet map
        this.leaflet = new Leaflet.Map( holderElement, leafletConfig );

        // Set a custom backdrop colour if one is present in the configuration
        if ( this.config.backdrop ) {
            holderElement.style.backgroundColor = this.config.backdrop;
        }

        // Prepare all backgrounds
        this.config.backgrounds.forEach( ( background, index ) => this._initialiseBackground( background, index ) );
        // Switch to the last chosen one or first defined
        this.setCurrentBackground( this.storage.data.background || 0 );
        // Create the legend anchor, even if the legend is disabled (some controls may use it)
        this._legendElement = createDomElement( 'div', {
            classes: [ 'ext-datamaps-container-legend' ],
            prependTo: this.resolveControlAnchor( DataMap.anchors._realTopLeft )
        } );
        // Bring to a valid state and call further initialisation methods
        this._buildControls();
        this.refreshMaxBounds();
        this.restoreDefaultView();
        this.updateMarkerScaling();

        // Recalculate marker sizes when zoom ends
        this.leaflet.on( 'zoom', this.updateMarkerScaling, this );

        // Install the interaction rejection controller
        const useSleepInteractions = this.isFeatureBitSet( MapFlags.SleepingInteractions )
            || this.isFeatureBitSet( MapFlags.VisualEditor );
        this.leaflet.addHandler( 'interactionControl', Leaflet.Ark[ useSleepInteractions ? 'SleepInteractionControl'
            : 'KeybindInteractionControl' ] );

        // Notify other components that the Leaflet component has been loaded, and remove all subscribers. All future
        // subscribers will be invoked right away.
        this.fireMemorised( 'leafletLoaded' );
        this.fireMemorised( 'leafletLoadedLate' );
    }


    /**
     * @private
     * @param {DataMaps.Configuration.Background} background
     * @param {number} index
     */
    _initialiseBackground( background, index ) {
        background.layers = [];

        // Set the associated layer name
        background.layer = background.layer || `${index}`;

        // Image overlay
        background.at = background.at || this.config.crs;
        if ( background.image ) {
            const imgLayer = new Leaflet.ImageOverlay(
                background.image,
                this.translateBox( background.at ),
                {
                    className: background.pixelated ? 'ext-datamaps-pixelated-image' : undefined,
                    decoding: 'async',
                    angle: this._crsAngle * 180 / Math.PI,
                    // Expand the DOM element's width and height by 0.51 pixels. This helps with gaps between tiles.
                    antiAliasing: background.aa ? 0.51 : 0
                }
            );
            background.layers.push( imgLayer );
        }

        // Prepare overlay layers
        if ( background.overlays ) {
            for ( const overlay of background.overlays ) {
                background.layers.push( this._buildBackgroundOverlayObject( overlay ) );
            }
        }
    }


    /**
     * @param {DataMap.anchors[ keyof DataMap.anchors ]} anchor
     * @return {HTMLElement}
     */
    resolveControlAnchor( anchor ) {
        return /** @type {HTMLElement} */ ( Util.getNonNull( this.rootElement.querySelector(
            `.leaflet-control-container ${anchor}` ) ) );
    }


    /**
     * Adds a custom control to Leaflet's container.
     *
     * Requires the Leaflet map to be initialised.
     *
     * @template {HTMLElement|Controls.MapControl} T
     * @param {DataMap.anchors[ keyof DataMap.anchors ]} anchor Anchor selector.
     * @param {T} control Control to add.
     * @param {boolean} [prepend] Whether to add the control to the beginning of the anchor.
     * @return {T} {@link control} for chaining.
     */
    addControl( anchor, control, prepend ) {
        const controlElement = /** @type {HTMLElement} */ ( control instanceof Controls.MapControl ? control.element : control ),
            anchorElement = this.resolveControlAnchor( anchor ),
            beforeInlineGroup = prepend && anchorElement.querySelector( ':scope > .ext-datamaps-control-group' );
        if ( beforeInlineGroup ) {
            anchorElement.insertBefore( controlElement, beforeInlineGroup.nextSibling );
        } else {
            anchorElement[ prepend ? 'prepend' : 'appendChild' ]( controlElement );
        }
        Util.preventMapInterference( controlElement );
        return control;
    }


    /**
     * @private
     */
    _buildControls() {
        // Create control container in top left corner
        createDomElement( 'div', {
            appendTo: this.resolveControlAnchor( DataMap.anchors._realTopLeft )
        } );
        // Create inline control containers (DataMap.anchors.topLeftInline and DataMap.anchors.topRightInline)
        for ( const anchor of [ DataMap.anchors.topLeft, DataMap.anchors.topRight ] ) {
            createDomElement( 'div', {
                classes: [ 'ext-datamaps-control-group' ],
                prependTo: this.resolveControlAnchor( anchor )
            } );
        }

        // Create a coordinate-under-cursor display
        if ( this.isFeatureBitSet( MapFlags.ShowCoordinates ) || this.isFeatureBitSet( MapFlags.VisualEditor ) ) {
            this.coordTracker = this.addControl( DataMap.anchors.bottomLeft, new Controls.Coordinates( this ) );
        }

        // Create a background toggle
        if ( this.config.backgrounds.length > 1 ) {
            this.backgroundSwitch = this.addControl( DataMap.anchors.legend, new Controls.BackgroundSwitcher( this ) );
        }

        // Extend zoom control to add buttons to reset or centre the view
        this.viewControls = this.addControl( DataMap.anchors.topRight, new Controls.ExtraViewControls( this ) );

        if ( this.isFeatureBitSet( MapFlags.AllowFullscreen ) ) {
            this.fullscreenToggle = this.addControl( DataMap.anchors.topRightInline, new Controls.ToggleFullscreen( this ) );
        }

        // Display an edit button to logged in users
        if ( !this.isFeatureBitSet( MapFlags.IsPreview ) && ( mw.config.get( 'wgUserName' ) !== null || Util.canAnonsEdit ) ) {
            this.editControl = this.addControl( DataMap.anchors.topRightInline, new Controls.EditButton( this ) );
        }
    }


    /**
     * @private
     * @fires DataMap#legendManager
     */
    _onOOUILoaded() {
        const container = Util.getNonNull( this.resolveControlAnchor( DataMap.anchors._realTopLeft ).querySelector(
            ':scope > .ext-datamaps-container-legend' ) );
        this.legend = new LegendTabber( this, /** @type {HTMLElement} */ ( container ) ).setExpanded( true );
        this.fireMemorised( 'legendManager' );
    }


    /**
     * @private
     * @fires markerFilteringPanel
     */
    _initialiseFiltersPanel() {
        // Determine if we'll need a layer dropdown
        const hasCaves = this.isLayerUsed( 'cave' );

        // Initialise legend objects
        this.filtersPanel = new MarkerFilteringPanel( /** @type {LegendTabber} */ ( this.legend ), true ).setVisible( true );

        // Build the surface and caves toggle
        // TODO: this should be gone by v0.15, preferably in v0.14 (though that one's going to be a 1.39 compat update)
        if ( hasCaves ) {
            this.filtersPanel.addMarkerLayerToggleRequired( 'cave', mw.msg( 'datamap-layer-surface' ), false );
            this.filtersPanel.addMarkerLayerToggleExclusive( 'cave', mw.msg( 'datamap-layer-cave' ) );
        }

        // Build individual group toggles
        this.filtersPanel.includeGroups( Object.keys( this.config.groups ) );

        // Notify other components that the legend has been loaded, and remove all subscribers. All future subscribers
        // will be invoked right away.
        this.fireMemorised( 'markerFilteringPanel' );
    }


    /**
     * @private
     * @fires DataMap#collectiblesPanel
     */
    _initialiseCollectiblesPanel() {
        this.collectiblesPanel = new CollectiblesPanel( /** @type {LegendTabber} */ ( this.legend ) ).setVisible( true );
        this.fireMemorised( 'collectiblesPanel' );
    }
}


/**
 * @constant
 */
DataMap.anchors = Object.freeze( {
    /** @package */
    _realTopLeft: '.leaflet-top.leaflet-left',
    /** @package */
    _none: '',

    legend: '.leaflet-top.leaflet-left > .ext-datamaps-container-legend',
    topLeft: '.leaflet-top.leaflet-left > :last-child',
    topRight: '.leaflet-top.leaflet-right',
    bottomLeft: '.leaflet-bottom.leaflet-left',
    bottomRight: '.leaflet-bottom.leaflet-right',

    topRightInline: '.leaflet-top.leaflet-right > .ext-datamaps-control-group',
    topLeftInline: '.leaflet-top.leaflet-left > :last-child > .ext-datamaps-control-group',

    veToolBar: '.ext-datamaps-control-ve-toolbar > .ext-datamaps-control-ve-toolbar-controls'
} );
/**
 * Content bounds padding.
 *
 * @constant
 * @type {LeafletModule.LatLngBoundsTuple}
 */
DataMap.BOUNDS_PADDING = [ [ 150, 200 ], [ 150, 250 ] ];
/**
 * Max zoom-caused scale value for vector markers.
 *
 * @constant
 * @type {number}
 */
DataMap.VECTOR_ZOOM_SCALING_MAX = 2.5;
/**
 * Max zoom-caused scale value for icon markers.
 *
 * @constant
 * @type {number}
 */
DataMap.ICON_ZOOM_SCALING_MAX = 1;
/**
 * Minimum and maximum viewport width for {@link DataMap.restoreDefaultView} to offset new view bounds by legend width.
 *
 * @constant
 * @type {[ min: number, max: number ]}
 */
DataMap.LEGEND_AFFECTS_BOUNDS_FIT_VIEWPORT_WIDTH = [ 1200, 2000 ];
/**
 * @constant
 * @type {number}
 */
DataMap.LEGEND_MINIMUM_GROUPS_TO_OFFSET_VIEWPORT = 5;


module.exports = DataMap;
