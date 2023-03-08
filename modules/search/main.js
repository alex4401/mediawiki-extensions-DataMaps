const
    {
        MapFlags,
        DataMap,
        Util,
        Controls
    } = /** @type {import( '../core' )} */ ( require( 'ext.datamaps.core' ) );
const
    MarkerSearchIndex = require( './indexing.js' ),
    MenuWidget = require( './menu.js' ),
    MenuOptionWidget = require( './option.js' );


class MarkerSearch extends Controls.MapControl {
    /**
     * @param {DataMap} map Owning map.
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

        // UI construction

        this.inputBox = new OO.ui.TextInputWidget( {
            placeholder: mw.msg( 'datamap-control-search' ),
            icon: 'search'
        } );
        this.menu = new MenuWidget( {
            widget: this.inputBox,
            input: this.inputBox,
            $floatableContainer: this.inputBox.$element,
            filterFromInput: true,
            filterMode: 'substring',
            verticalPosition: 'below',
            width: '100%'
        } );

        this.inputBox.$element.appendTo( this.element );
        this.menu.$element.appendTo( this.inputBox.$element );

        if ( this.isLinked ) {
            this.linkedToggle = new OO.ui.ToggleButtonWidget( {
                label: mw.msg( 'datamap-control-search-toggle-sharing' ),
                value: true
            } );
            this.linkedToggle.on( 'change', value =>
                this._setDisplayIndex( value ? this.ownedIndex.parent : this.ownedIndex ) );
            this.linkedToggle.$element.insertBefore( this.inputBox.$indicator );
        }

        this.menu.$element.on( 'scroll mousewheel wheel', event => event.stopPropagation() );

        this.inputBox.on( 'change', this.onTextChange, null, this );
        this.inputBox.$element.on( 'mousedown', this.onFocus.bind( this ) );
        this.menu.on( 'choose', this.onMenuItemChosen, null, this );

        this.map.leaflet.on( 'click', this.close, this );

        // Initialisation logic

        // Build the index from markers that have been loaded so far
        this._setDisplayIndex( this.isLinked ? /** @type {MarkerSearchIndex.ChildIndex} */ ( this.ownedIndex ).parent
            : this.ownedIndex );
        this.addExistingMarkersToOwnIndex();
        // Set up event handlers
        this.map.on( 'markerReady', this.addMarker, this );
        this.map.on( 'chunkStreamingDone', this.onChunkStreamed, this );
    }


    /**
     * @param {MarkerSearchIndex} index
     */
    _setDisplayIndex( index ) {
        if ( this.displayIndex ) {
            this.displayIndex.off( 'commit', this._acceptOptions, this );
        }

        this.displayIndex = index;
        this.menu.clearItems();
        this._acceptOptions( this.displayIndex.items );

        this.displayIndex.on( 'commit', this._acceptOptions, this );
    }


    _acceptOptions( items ) {
        const widgets = [];
        for ( const item of items ) {
            widgets.push( new MenuOptionWidget( this._getItemInfo( item ) ) );
        }
        this.menu.addItems( widgets );
    }


    _getItemInfo( item ) {
        return {
            // Reference to index entry
            data: item,
            // Query backing info
            keywords: item.keywords,
            // Display
            label: new OO.ui.HtmlSnippet( item.label ),
            badge: this._getItemBadge( item ),
            badgeCurrent: item.map === this.map,
            $tab: this.isLinked && item.map !== this.map ? Util.TabberNeue.getOwningTabber( item.map.rootElement )
                .querySelector( '#' + Util.TabberNeue.getOwningPanel( item.map.rootElement ).getAttribute( 'aria-labelledby' ) )
                : null
        };
    }


    _getItemBadge( item ) {
        if ( this.isLinked ) {
            return Util.TabberNeue.getOwningPanel( item.map.rootElement ).attr( 'data-title' );
        }

        const properties = item.leafletMarker.assignedProperties;
        if ( properties && properties.bg !== undefined ) {
            const background = item.map.config.backgrounds.find( x => x.layer === properties.bg );
            if ( background ) {
                return background.name;
            }
        }

        return null;
    }


    onFocus() {
        this.onTextChange( this.inputBox.getValue() );
    }


    close() {
        if ( this.menu.isVisible() ) {
            this.menu.toggle( false );
        }
    }


    onTextChange( value ) {
        this.menu.toggle( value.length > 0 );
    }


    onMenuItemChosen( item ) {
        this.close();
        setTimeout( () => {
            item.data.map.openMarkerPopup( item.data.leafletMarker );
            if ( item.$tab ) {
                item.$tab.get( 0 ).click();
            }
        } );
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
     * @param {*} leafletMarker
     */
    addMarker( leafletMarker ) {
        this.ownedIndex.add( this.map, leafletMarker );
    }


    onChunkStreamed() {
        this.ownedIndex.commit();
    }
}


const sharedTabberIndexMap = {};
mw.dataMaps.registerMapAddedHandler( map => {
    if ( map.isFeatureBitSet( MapFlags.Search ) ) {
        map.on( 'leafletLoaded', () => {
            const isLinked = map.isFeatureBitSet( MapFlags.LinkedSearch ),
                $tabber = Util.TabberNeue.getOwningTabber( map.$root );
            let index;
            if ( isLinked && $tabber ) {
                const masterIndex = sharedTabberIndexMap[ $tabber ] || new MarkerSearchIndex();
                sharedTabberIndexMap[ $tabber ] = masterIndex;
                index = new MarkerSearchIndex.ChildIndex( masterIndex );
            } else {
                index = new MarkerSearchIndex();
            }

            map.search = map.addControl( DataMap.anchors.topLeftInline, new MarkerSearch( map, index, isLinked && $tabber ) );
        } );
    }
} );
