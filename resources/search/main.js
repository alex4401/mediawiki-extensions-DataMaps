const Util = require( './util.js' ),
    MenuWidget = require( './menu.js' );


class MarkerSearch {
    constructor( map ) {
        this.map = map;

        this.map.waitForLegend( () => {
            this.map.waitForLeaflet( () => {
                this._initialiseUI();
                this.importExisting();

                this.map.on( 'markerReady', this.addMarker, this );
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

        this.$root.on( 'click dblclick scroll mousewheel wheel', event => event.stopPropagation() );
        this.menu.$element.on( 'scroll mousewheel wheel', event => event.stopPropagation() );

        this.inputBox.on( 'change', this.onTextChange, null, this );
        this.inputBox.$element.on( 'mousedown', this.onFocus.bind( this ) );
        this.menu.on( 'choose', this.onMenuItemChosen, null, this );

        this.map.leaflet.on( 'click', this.close, this );
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
        setTimeout( () => item.data.openPopup() );
    }


    importExisting() {
        for ( const marker of this.map.layerManager.markers ) {
            this.addMarker( marker );
        }
    }


    addMarker( leafletMarker ) {
        const state = leafletMarker.apiInstance[2];
        const group = this.map.config.groups[leafletMarker.attachedLayers[0]];
        const label = state.label || group.name;

        if ( state.search == 0 || mw.dataMaps.Util.isBitSet( group.flags, mw.dataMaps.Enums.MarkerGroupFlags.CannotBeSearched ) ) {
            return;
        }

        // If no keywords were provided by the API, generate them from label and description
        if ( !state.search ) {
            state.search = [ [ Util.decodePartial( Util.extractText( label ) ), 1.5 ] ];
            if ( state.desc ) {
                state.search.push( [ state.desc, 0.75 ] );
            }
        }
        // If string was provided by the API, turn into a pair
        if ( typeof( state.search ) === 'string' ) {
            state.search = [ [ state.search, 1 ] ];
        }
        // Ensure search keywords are always an array of (text, weight) pairs
        state.search = state.search.map( x => ( typeof( x ) === 'string' ) ? [ x, 1 ] : x );

        this.menu.addItem( {
            icon: leafletMarker instanceof L.Ark.IconMarker ? this.map.getIconFromLayers( leafletMarker.attachedLayers ) : null,
            data: leafletMarker,
            keywords: state.search,
            label: new OO.ui.HtmlSnippet( label )
        } );
    }
}


mw.dataMaps.subscribeHook( 'afterInitialisation', ( map ) => {
    if ( map.isFeatureBitSet( map.FF_SEARCH ) ) {
        map.search = new MarkerSearch( map );
    }
} );
