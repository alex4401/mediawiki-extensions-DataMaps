const Util = require( './util.js' ),
    MenuWidget = require( './menu.js' );


function MarkerSearch( map ) {
    this.map = map;

    this.map.waitForLegend( () => {
        this.map.waitForLeaflet( () => {
            this._initialiseUI();
            this.importExisting();

            this.map.on( 'markerReady', this.addMarker, this );
        } );
    } );
}


MarkerSearch.prototype._initialiseUI = function () {
    this.$root = this.map.addControl( this.map.anchors.topLeft,
        $( '<div class="leaflet-control leaflet-bar datamap-control-search">' ), true );
    
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
};


MarkerSearch.prototype.onFocus = function () {
    this.onTextChange( this.inputBox.getValue() );
};


MarkerSearch.prototype.close = function () {
    if ( this.menu.isVisible() ) {
        this.menu.toggle( false );
    }
};


MarkerSearch.prototype.onTextChange = function ( value ) {
    this.menu.toggle( value.length > 0 );
};


MarkerSearch.prototype.onMenuItemChosen = function ( item ) {
    this.close();
    this.inputBox.setValue( '', true );
    setTimeout( () => item.data.openPopup() );
};


MarkerSearch.prototype.importExisting = function () {
    for ( const marker of this.map.layerManager.markers ) {
        this.addMarker( marker );
    }
};


MarkerSearch.prototype.addMarker = function ( leafletMarker ) {
    const state = leafletMarker.apiInstance[2];
    const group = this.map.config.groups[leafletMarker.attachedLayers[0]];
    const label = state.label || group.name;

    if ( group.doNotSearch ) {
        return;
    }

    if ( !state.search ) {
        state.search = ( `${ Util.extractText( label ) } ${ Util.extractText( state.desc || '' ) }` )
            .replace( /&#39;/g, "'" ).replace( /&#34;/g, '"' ).replace( /&#32;/g, ' ' );
    }

    this.menu.addItem( {
        icon: leafletMarker instanceof L.Ark.IconMarker ? this.map.getIconFromLayers( leafletMarker.attachedLayers.join( ' ' ),
            leafletMarker.attachedLayers ) : null,
        data: leafletMarker,
        keywords: state.search,
        label: new OO.ui.HtmlSnippet( label )
    } );
};


mw.dataMaps.subscribeHook( 'afterInitialisation', ( map ) => {
    if ( map.isFeatureBitSet( map.FF_SEARCH ) ) {
        map.search = new MarkerSearch( map );
    }
} );
