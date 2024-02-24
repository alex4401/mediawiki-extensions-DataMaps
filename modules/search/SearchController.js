const
    {
        DataMap,
        Util,
        Controls
    } = require( 'ext.datamaps.core' ),
    Leaflet = require( 'ext.datamaps.leaflet' ),
    SearchIndex = require( './SearchIndex.js' ),
    { createDomElement, getNonNull } = Util;


/**
 * @typedef {Object} ItemExtensionProps
 * @property {HTMLElement} [element]
 */
/**
 * @typedef {SearchIndex.Item & ItemExtensionProps} Item
 */


class SearchController {
    /**
     * @param {InstanceType<typeof Controls.SearchHost>} control
     * @param {OO.ui.TextInputWidget} inputBox
     * @param {SearchIndex} index
     */
    constructor( control, inputBox, index ) {
        /**
         * @private
         * @type {InstanceType<typeof Controls.SearchHost>}
         */
        this._control = control;
        /**
         * @private
         * @type {InstanceType<DataMap>}
         */
        this._map = control.map;
        /**
         * @private
         * @type {OO.ui.TextInputWidget}
         */
        this._inputBox = inputBox;
        /**
         * @private
         * @type {SearchIndex}
         */
        this._ownedIndex = index;
        /**
         * @private
         * @type {SearchIndex?}
         */
        this._displayIndex = null;
        /**
         * @private
         * @type {boolean}
         */
        this._isLinked = index instanceof SearchIndex.ChildIndex;
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
        /**
         * @private
         * @type {number?}
         */
        this._commitTimeoutId = null;
        /**
         * @private
         * @type {HTMLElement}
         */
        this._listElement = createDomElement( 'ul', {
            classes: [ 'ext-datamaps-control-search-results' ],
            appendTo: this._inputBox.$element[ 0 ]
        } );

        /**
         * @private
         * @type {OO.ui.ToggleButtonWidget?}
         */
        this._linkedToggle = null;
        if ( this._isLinked ) {
            this._linkedToggle = new OO.ui.ToggleButtonWidget( {
                label: mw.msg( 'datamap-control-search-toggle-sharing' ),
                value: true
            } );
            this._linkedToggle.on( 'change', value => {
                this._setDisplayIndex( value ? this._ownedIndex.parent : this._ownedIndex );
            } );
            this._linkedToggle.$element.insertBefore( this._inputBox.$indicator );
        }

        // Initialisation logic

        // Build the index from markers that have been loaded so far
        this._setDisplayIndex(
            this._isLinked
                ? /** @type {InstanceType<SearchIndex.ChildIndex>} */ ( this._ownedIndex ).parent
                : this._ownedIndex
        );

        // Set up event handlers
        this._inputBox.$input.on( 'mousedown', () => this.toggle( true ) );
        this._inputBox.$input[ 0 ].addEventListener( 'keydown', event => this._handleInputKeyDownEvent( event ) );
        this._inputBox.on( 'change', () => this._handleInputChange() );
        this._listElement.addEventListener( 'click', () => this._inputBox.$input[ 0 ].focus() );
        Util.getNonNull( this._map.viewport ).getLeafletMap().on( 'click', () => this.toggle( false ), this );
        this._map.on( 'markerReady', this.addMarker, this );

        // Immediately index markers that have already been added to the map
        this._indexExisting();
    }


    /**
     * @return {boolean}
     */
    isLinked() {
        return this._isLinked;
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
    _indexExisting() {
        for ( const leafletMarker of this._map.layerManager.markers ) {
            this._ownedIndex.add( this._map, leafletMarker );
        }
        this._ownedIndex.commit();
    }


    /**
     * Adds a single marker to the index owned by this control.
     *
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    addMarker( leafletMarker ) {
        this._ownedIndex.add( this._map, leafletMarker );
        if ( this._commitTimeoutId === null ) {
            this._commitTimeoutId = setTimeout( () => this._ownedIndex.commit(), 0 );
        }
    }


    /**
     * @param {SearchIndex} index
     */
    _setDisplayIndex( index ) {
        if ( this._displayIndex ) {
            this._displayIndex.off( 'commit', this.refreshItems, this );
        }

        this._displayIndex = index;
        this.refreshItems();

        getNonNull( this._displayIndex ).on( 'commit', this.refreshItems, this );
    }


    /**
     * @private
     * @param {Item} item
     */
    _handleItemChoice( item ) {
        this._inputBox.setValue( '', true );
        this.toggle( false );
        item.map.openMarkerPopup( item.leafletMarker, true );
        const tabber = /** @type {HTMLElement?} */ ( this._isLinked && item.map !== this._map
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
        this._listElement.textContent = '';
        createDomElement( 'li', {
            text: mw.msg( 'datamap-control-search-no-results' ),
            appendTo: this._listElement
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
                || this._listElement.firstChild );
        } else if ( item === 'previous' ) {
            this._highlighted = /** @type {HTMLElement?} */ ( this._highlighted && this._highlighted.previousSibling
                || this._listElement.lastChild );
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
        this._listElement.textContent = '';
        this._listElement.scrollTop = 0;

        if ( !this._cachedItems || this._cachedItems.length === 0 ) {
            this._showNoItemsMessage();
            return;
        }

        for ( const item of this._cachedItems ) {
            if ( !item.element ) {
                item.element = createDomElement( 'li', {
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
                        iconElement = Util.createPinIconElement( {
                            colour: icon.options.colour
                        } );
                        iconElement.setAttribute( 'width', '16' );
                        iconElement.setAttribute( 'height', '16' );
                    } else {
                        iconElement = createDomElement( 'img', {
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
                    createDomElement( 'span', {
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
            this._listElement.appendChild( Util.getNonNull( item.element ) );
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
        if ( this._isLinked && item.map !== this._map ) {
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
        if ( this._displayIndex ) {
            this._cachedItems = query === '' ? this._displayIndex.items : this._displayIndex.query( query ).map( x => x.obj );
        } else {
            this._cachedItems = null;
        }
        this._renderItems();
    }


    isOpen() {
        return this._control.element.getAttribute( 'aria-expanded' ) === 'true';
    }


    /**
     * @param {boolean} value
     */
    toggle( value ) {
        this._control.element.setAttribute( 'aria-expanded', value ? 'true' : 'false' );
        this._renderItems();
    }
}


module.exports = SearchController;
