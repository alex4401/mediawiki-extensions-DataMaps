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
        /**
         * @private
         * @type {HTMLElement?}
         */
        this._highlighted = null;
        /**
         * @private
         * @type {number?}
         */
        this._ignoreTimeout = null;

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
        this._inputBox.$input[ 0 ].addEventListener( 'keydown', event => this._handleInputKeyDownEvent( event ) );
        this._inputBox.on( 'change', () => this._handleInputChange() );
        this._innerElement.addEventListener( 'click', () => this._inputBox.$input[ 0 ].focus() );
        this.map.leaflet.on( 'click', () => this.toggle( false ), this );
        this.map.on( 'markerReady', this.addMarker, this );
        this.map.on( 'chunkStreamingDone', this._onChunkStreamed, this );
    }


    /**
     * @private
     * @param {KeyboardEvent} event
     */
    _handleInputKeyDownEvent( event ) {
        let handled = false;
        if ( event.key === 'Escape' && this.isOpen() ) {
            this.toggle( false );
            handled = true;
        } else if ( event.key === 'ArrowUp' ) {
            this._setHighlightedItem( 'previous' );
            handled = true;
        } else if ( event.key === 'ArrowDown' ) {
            this._setHighlightedItem( 'next' );
            handled = true;
        } else if ( ( event.key === 'Enter' || event.key === 'Tab' ) && this._highlighted ) {
            this._highlighted.click();
            handled = true;
        }

        if ( handled ) {
            event.stopPropagation();
        }
    }


    /**
     * @private
     */
    _handleInputChange() {
        if ( !this.isOpen() ) {
            this.toggle( true );
        }
        this.refreshItems();
    }


    /**
     * @private
     * @param {MouseEvent} event
     */
    _handleItemMouseOverEvent( event ) {
        if ( this._ignoreTimeout !== null ) {
            return;
        }
        this._setHighlightedItem( /** @type {HTMLElement} */ ( event.currentTarget ), true );
        event.stopPropagation();
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
        item.map.openMarkerPopup( item.leafletMarker, true );
        const tabber = /** @type {HTMLElement?} */ ( this.isLinked && item.map !== this.map
            ? getNonNull( Util.TabberNeue.getOwningTabber( item.map.rootElement ) ).querySelector( '#' + getNonNull(
                Util.TabberNeue.getOwningPanel( item.map.rootElement ) ).getAttribute( 'aria-labelledby' ) )
            : null );
        if ( tabber ) {
            tabber.click();
        }
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
     * @param {'previous'|'next'|HTMLElement?} item
     * @param {boolean} [isMouseOver=false]
     */
    _setHighlightedItem( item, isMouseOver ) {
        if ( this._highlighted ) {
            this._highlighted.dataset.highlighted = 'false';
        }

        if ( item === 'next' ) {
            this._highlighted = /** @type {HTMLElement?} */ ( this._highlighted && this._highlighted.nextSibling
                || this._innerElement.firstChild );
        } else if ( item === 'previous' ) {
            this._highlighted = /** @type {HTMLElement?} */ ( this._highlighted && this._highlighted.previousSibling
                || this._innerElement.lastChild );
        } else if ( typeof item !== 'string' ) {
            this._highlighted = item;
        }

        if ( this._highlighted ) {
            this._highlighted.dataset.highlighted = 'true';
            if ( !isMouseOver ) {
                // Ignore mouseover events caused by the scroll
                if ( this._ignoreTimeout ) {
                    clearTimeout( this._ignoreTimeout );
                }
                this._ignoreTimeout = setTimeout( () => {
                    this._ignoreTimeout = null;
                }, 200 );

                this._highlighted.scrollIntoView( {
                    // @ts-ignore: typings apparently don't include this value
                    behavior: 'instant',
                    block: 'nearest'
                } );
            }
        }
    }


    /**
     * @private
     */
    _renderItems() {
        // Cancel if the list is not expanded
        if ( !this.isOpen() ) {
            return;
        }

        // Clear and scroll to top
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
                        role: 'option',
                        tabindex: -1
                    },
                    events: {
                        click: event => {
                            this._handleItemChoice( item );
                            event.stopPropagation();
                        },
                        mouseover: event => this._handleItemMouseOverEvent( event )
                    }
                } );

                const icon = item.leafletMarker instanceof Leaflet.Marker
                        ? item.map.getIconFromLayers( item.leafletMarker.attachedLayers ) : null,
                    badgeInfo = this._getItemBadge( item );
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

                if ( badgeInfo ) {
                    Util.createDomElement( 'span', {
                        classes: [ 'ext-datamaps-search-badge' ],
                        attributes: {
                            'data-current': badgeInfo[ 1 ]
                        },
                        text: badgeInfo[ 0 ],
                        appendTo: item.element
                    } );
                }
            }
        }

        for ( const item of Util.getNonNull( this._cachedItems ) ) {
            this._innerElement.appendChild( Util.getNonNull( item.element ) );
        }

        if ( this._highlighted && this._highlighted.parentNode !== null ) {
            this._setHighlightedItem( this._highlighted );
        } else {
            this._setHighlightedItem( null );
            this._setHighlightedItem( 'next' );
        }
    }


    /**
     * @private
     * @param {Item} item
     * @return {[ name: string, current: boolean ]?}
     */
    _getItemBadge( item ) {
        if ( this.isLinked && item.map !== this.map ) {
            const title = getNonNull( Util.TabberNeue.getOwningPanel( item.map.rootElement ) ).getAttribute( 'data-title' );
            return title ? [ title, false ] : null;
        }

        const properties = item.leafletMarker.assignedProperties;
        if ( properties && properties.bg !== undefined ) {
            const background = item.map.config.backgrounds.find( x => x.layer === properties.bg );
            if ( background && background.name ) {
                return [ background.name, item.map.background === background ];
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


    isOpen() {
        return this.element.getAttribute( 'aria-expanded' ) === 'true';
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
