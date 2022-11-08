const MarkerSearchIndex = require( './indexing.js' ),
    MenuWidget = require( './menu.js' ),
    MenuOptionWidget = require( './option.js' ),
    Enums = mw.dataMaps.Enums;


class MarkerSearch {
    constructor( map, index, isLinked ) {
        this.map = map;
        this.ownedIndex = index;
        this.displayIndex = null;
        this.isLinked = isLinked;

        this.map.waitForLegend( () => {
            this.map.waitForLeaflet( () => {
                this._initialiseUI();

                this._setDisplayIndex( this.isLinked ? this.ownedIndex.parent : this.ownedIndex );
                this.addExistingMarkersToOwnIndex();

                this.map.on( 'markerReady', this.addMarker, this );
                this.map.on( 'chunkStreamingDone', this.onChunkStreamed, this );
            } );
        } );
    }


    _initialiseUI() {
        this.$root = this.map.addControl( this.map.anchors.topLeft,
            $( '<div class="leaflet-control datamap-control leaflet-bar datamap-control-search">' ), true );
        
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

        this.inputBox.$element.appendTo( this.$root );
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

        this.$root.on( 'click dblclick scroll mousewheel wheel', event => event.stopPropagation() );
        this.menu.$element.on( 'scroll mousewheel wheel', event => event.stopPropagation() );

        this.inputBox.on( 'change', this.onTextChange, null, this );
        this.inputBox.$element.on( 'mousedown', this.onFocus.bind( this ) );
        this.menu.on( 'choose', this.onMenuItemChosen, null, this );

        this.map.leaflet.on( 'click', this.close, this );
    }


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
            widgets.push( new MenuOptionWidget( {
                // Reference to index entry
                data: item,
                // Query backing info
                keywords: item.keywords,
                // Display
                label: new OO.ui.HtmlSnippet( item.label ),
                badge: this.isLinked ? item.map.getParentTabberNeuePanel().attr( 'title' ) : null,
                badgeCurrent: item.map === this.map,
                $tab: this.isLinked && item.map !== this.map ? item.map.getParentTabberNeue().find( '#' + item.map.getParentTabberNeuePanel()
                    .attr( 'aria-labelledby' ) ) : null,
            } ) );
        }
        this.menu.addItems( widgets );
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
        this.inputBox.setValue( '', true );
        setTimeout( () => {
            item.data.leafletMarker.openPopup();
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
    if ( map.isFeatureBitSet( Enums.MapFlags.Search ) ) {
        const isLinked = map.isFeatureBitSet( Enums.MapFlags.LinkedSearch ),
            $tabber = map.getParentTabberNeue();
        let index;

        if ( isLinked && $tabber ) {
            const masterIndex = sharedTabberIndexMap[$tabber] || new MarkerSearchIndex();
            sharedTabberIndexMap[$tabber] = masterIndex;
            index = new MarkerSearchIndex.ChildIndex( masterIndex );
        } else {
            index = new MarkerSearchIndex();
        }

        map.search = new MarkerSearch( map, index, isLinked && $tabber );
    }
} );
