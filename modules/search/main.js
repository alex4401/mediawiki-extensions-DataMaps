const
    {
        MapFlags,
        DataMap,
        Util,
        Controls
    } = require( 'ext.datamaps.core' ),
    Leaflet = require( 'ext.datamaps.leaflet' ),
    MarkerSearchIndex = require( './indexing.js' ),
    getNonNull = Util.getNonNull;


/**
 * @typedef {Object} ItemExtensionProps
 * @property {HTMLElement} [element]
 */
/**
 * @typedef {MarkerSearchIndex.Item & ItemExtensionProps} Item
 */


class MarkerSearch extends Controls.MapControl {
    /**
     * @param {InstanceType<DataMap>} map Owning map.
     * @param {MarkerSearchIndex} index
     * @param {boolean} isLinked
     */
    constructor( map, index, isLinked ) {
        super( map, 'search' );

        /** @type {MarkerSearchIndex} */
        this.ownedIndex = index;
        /** @type {MarkerSearchIndex?} */
        this.displayIndex = null;
        /** @type {boolean} */
        this.isLinked = isLinked;
        /**
         * @private
         * @type {Item[]?}
         */
        this._cachedItems = null;

        // UI construction

        /**
         * @private
         * @type {OO.ui.TextInputWidget}
         */
        this._inputBox = new OO.ui.TextInputWidget( {
            placeholder: mw.msg( 'datamap-control-search' ),
            icon: 'search'
        } );
        this._inputBox.$element.appendTo( this.element );
        /**
         * @private
         * @type {HTMLElement}
         */
        this._innerElement = Util.createDomElement( 'ul', {
            classes: [ 'ext-datamaps-control-search-results' ],
            appendTo: this._inputBox.$element[ 0 ]
        } );

        if ( this.isLinked ) {
            this.linkedToggle = new OO.ui.ToggleButtonWidget( {
                label: mw.msg( 'datamap-control-search-toggle-sharing' ),
                value: true
            } );
            this.linkedToggle.on( 'change', value => this._setDisplayIndex( value ? this.ownedIndex.parent : this.ownedIndex ) );
            this.linkedToggle.$element.insertBefore( this._inputBox.$indicator );
        }

        // Initialisation logic

        // Build the index from markers that have been loaded so far
        this._setDisplayIndex( this.isLinked ? /** @type {MarkerSearchIndex.ChildIndex} */ ( this.ownedIndex ).parent
            : this.ownedIndex );
        this.addExistingMarkersToOwnIndex();
        // Set up event handlers
        Util.preventMapInterference( this.element );
        this._inputBox.$input.on( 'mousedown', () => this.toggle( true ) );
        this._inputBox.on( 'change', () => this.refreshItems() );
        this.map.leaflet.on( 'click', () => this.toggle( false ), this );
        this.map.on( 'markerReady', this.addMarker, this );
        this.map.on( 'chunkStreamingDone', this._onChunkStreamed, this );
    }


    /**
     * Inserts markers from the map to the index owned by this control.
     */
    addExistingMarkersToOwnIndex() {
        for ( const leafletMarker of this.map.layerManager.markers ) {
            this.ownedIndex.add( this.map, leafletMarker );
        }
        this.ownedIndex.commit();
    }


    /**
     * Adds a single marker to the index owned by this control.
     *
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    addMarker( leafletMarker ) {
        this.ownedIndex.add( this.map, leafletMarker );
    }


    /**
     * @private
     */
    _onChunkStreamed() {
        this.ownedIndex.commit();
    }


    /**
     * @param {MarkerSearchIndex} index
     */
    _setDisplayIndex( index ) {
        if ( this.displayIndex ) {
            this.displayIndex.off( 'commit', this.refreshItems, this );
        }

        this.displayIndex = index;
        this.refreshItems();

        this.displayIndex.on( 'commit', this.refreshItems, this );
    }


    /**
     * @private
     * @param {Item} item
     */
    _handleItemChoice( item ) {
        this._inputBox.setValue( '', true );
        this.toggle( false );
        setTimeout( () => {
            item.map.openMarkerPopup( item.leafletMarker, true );
            const tabber = /** @type {HTMLElement?} */ ( this.isLinked && item.map !== this.map
                ? getNonNull( Util.TabberNeue.getOwningTabber( item.map.rootElement ) ).querySelector( '#' + getNonNull(
                    Util.TabberNeue.getOwningPanel( item.map.rootElement ) ).getAttribute( 'aria-labelledby' ) )
                : null );
            if ( tabber ) {
                tabber.click();
            }
        } );
    }


    /**
     * @private
     */
    _showNoItemsMessage() {
        this._innerElement.textContent = '';
        Util.createDomElement( 'li', {
            text: mw.msg( 'datamap-control-search-no-results' ),
            appendTo: this._innerElement
        } );
    }


    /**
     * @private
     */
    _renderItems() {
        // Cancel if the list is not expanded
        if ( this.element.getAttribute( 'aria-expanded' ) !== 'true' ) {
            return;
        }

        this._innerElement.textContent = '';
        this._innerElement.scrollTop = 0;

        if ( !this._cachedItems || this._cachedItems.length === 0 ) {
            this._showNoItemsMessage();
            return;
        }

        for ( const item of this._cachedItems ) {
            if ( !item.element ) {
                item.element = Util.createDomElement( 'li', {
                    html: item.label,
                    attributes: {
                        role: 'option'
                    },
                    events: {
                        click: () => this._handleItemChoice( item )
                    }
                } );

                const icon = item.leafletMarker instanceof Leaflet.Marker
                        ? item.map.getIconFromLayers( item.leafletMarker.attachedLayers ) : null,
                    badgeText = this._getItemBadge( item );
                if ( icon ) {
                    let iconElement;
                    if ( icon instanceof Leaflet.Ark.PinIcon ) {
                        iconElement = Util.createPinIconElement( icon.options.colour );
                        iconElement.setAttribute( 'width', '16' );
                        iconElement.setAttribute( 'height', '16' );
                    } else {
                        iconElement = Util.createDomElement( 'img', {
                            attributes: {
                                width: 16,
                                height: 16,
                                src: icon.options.iconUrl
                            }
                        } );
                    }
                    item.element.prepend( iconElement );
                }

                if ( badgeText ) {
                    Util.createDomElement( 'span', {
                        classes: [ 'ext-datamaps-search-badge' ],
                        attributes: {
                            'data-current': item.map === this.map
                        },
                        text: badgeText,
                        appendTo: item.element
                    } );
                }
            }
        }

        for ( const item of Util.getNonNull( this._cachedItems ) ) {
            this._innerElement.appendChild( Util.getNonNull( item.element ) );
        }
    }


    /**
     * @private
     * @param {Item} item
     * @return {string?}
     */
    _getItemBadge( item ) {
        if ( this.isLinked ) {
            return getNonNull( Util.TabberNeue.getOwningPanel( item.map.rootElement ) ).getAttribute( 'data-title' );
        }

        const properties = item.leafletMarker.assignedProperties;
        if ( properties && properties.bg !== undefined ) {
            const background = item.map.config.backgrounds.find( x => x.layer === properties.bg );
            if ( background && background.name ) {
                return background.name;
            }
        }

        return null;
    }


    refreshItems() {
        const query = this._inputBox.getValue();
        if ( this.displayIndex ) {
            this._cachedItems = query === '' ? this.displayIndex.items : this.displayIndex.query( query ).map( x => x.obj );
        } else {
            this._cachedItems = null;
        }
        this._renderItems();
    }


    /**
     * @param {boolean} value
     */
    toggle( value ) {
        this.element.setAttribute( 'aria-expanded', value ? 'true' : 'false' );
        this._renderItems();
    }
}


/**
 * @type {Record<string, MarkerSearchIndex>}
 */
const sharedTabberIndexMap = {};
mw.dataMaps.registerMapAddedHandler( map => {
    if ( map.isFeatureBitSet( MapFlags.Search ) ) {
        map.on( 'leafletLoaded', () => {
            let isLinked = map.isFeatureBitSet( MapFlags.LinkedSearch ),
                tabberId = null;

            if ( isLinked ) {
                tabberId = Util.TabberNeue.getOwningId( map.rootElement );
                isLinked = tabberId !== null;
            }

            let index;
            if ( isLinked && tabberId !== null ) {
                const masterIndex = sharedTabberIndexMap[ tabberId ] = sharedTabberIndexMap[ tabberId ]
                    || new MarkerSearchIndex();
                index = new MarkerSearchIndex.ChildIndex( masterIndex );
            } else {
                index = new MarkerSearchIndex();
            }

            map.search = map.addControl( DataMap.anchors.legend, new MarkerSearch( map, index, isLinked ), true );
        } );
    }
} );
