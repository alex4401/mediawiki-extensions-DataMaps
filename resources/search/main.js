const MarkerSearchIndex = require( './indexing.js' ),
    MenuWidget = require( './menu.js' );


class MarkerSearch {
    constructor( map, index, isLinked ) {
        this.map = map;
        this.index = index;
        this.isLinked = isLinked;

        this.map.waitForLegend( () => {
            this.map.waitForLeaflet( () => {
                this._initialiseUI();

                this.index.on( 'commit', this.onIndexCommitted, this );
                this.importExisting();

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
            this.linkedToggle.$element.insertBefore( this.inputBox.$indicator );
        }

        this.$root.on( 'click dblclick scroll mousewheel wheel', event => event.stopPropagation() );
        this.menu.$element.on( 'scroll mousewheel wheel', event => event.stopPropagation() );

        this.inputBox.on( 'change', this.onTextChange, null, this );
        this.inputBox.$element.on( 'mousedown', this.onFocus.bind( this ) );
        this.menu.on( 'choose', this.onMenuItemChosen, null, this );

        this.map.leaflet.on( 'click', this.close, this );
    }


    getActiveIndex() {
        if ( this.isLinked ) {
            return this.index.parent;
        }
        return this.index;
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
            item.data.openPopup();
            if ( item.$tab ) {
                item.$tab.get( 0 ).click();
            }
        } );
    }


    importExisting() {
        this.onIndexCommitted( this.index.items );

        for ( const leafletMarker of this.map.layerManager.markers ) {
            this.index.add( this.map, leafletMarker );
        }
        this.index.commit();
    }


    addMarker( leafletMarker ) {
        this.index.add( this.map, leafletMarker );
    }


    onIndexCommitted( items ) {
        for ( const item of items ) {
            this.menu.addItem( {
                icon: item.icon,
                data: item.marker,
                keywords: item.keywords,
                label: new OO.ui.HtmlSnippet( item.label ),
                $tab: this.isLinked && item.map !== this.map ? item.map.getParentTabberNeue().find( '#' + item.map.getParentTabberNeuePanel()
                    .attr( 'aria-labelledby' ) ) : null,
                badge: this.isLinked ? item.map.getParentTabberNeuePanel().attr( 'title' ) : null,
                badgeCurrent: item.map === this.map
            } );
        }
    }

    
    onChunkStreamed() {
        this.index.commit();
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
