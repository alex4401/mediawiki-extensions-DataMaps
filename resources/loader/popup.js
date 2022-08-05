const config = require( './config.json' );


function MarkerPopup( map, markerType, coords, slots, leafletMarker ) {
    this.map = map;
    this.markerType = markerType;
    this.markerLayers = markerType.split( ' ' );
    this.markerGroup = map.config.groups[this.markerLayers[0]];
    this.coords = coords;
    this.slots = slots;
    this.leafletMarker = leafletMarker;
    this.$content = $( '<div class="datamap-popup-content">' );
    this.$tools = $( '<ul class="datamap-popup-tools">' );
}


MarkerPopup.URL_PARAMETER = 'marker';


MarkerPopup.updateLocation = function ( persistentMarkerId ) {
    const params = new URLSearchParams( window.location.search );
    if ( persistentMarkerId ) {
        params.set( MarkerPopup.URL_PARAMETER, persistentMarkerId );
    } else {
        params.delete( MarkerPopup.URL_PARAMETER );
    }
    history.replaceState( {}, '', decodeURIComponent( `${window.location.pathname}?${params}#${window.location.hash}` ).replace( /[\?#]$/, '' ) );
};


MarkerPopup.prototype.getDismissToolText = function () {
    return mw.msg( 'datamap-popup-' + ( this.map.storage.isDismissed( this.markerType, this.coords )
        ? 'dismissed' : 'mark-as-dismissed' ) );
};


/*
 * Builds popup contents for a marker instance
 */
MarkerPopup.prototype.build = function () {
    // Build the title
    if ( this.slots.label && this.markerGroup.name !== this.slots.label ) {
        $( '<b class="datamap-popup-subtitle">' ).text( this.markerGroup.name ).appendTo( this.$content );
        $( '<b class="datamap-popup-title">' ).text( this.slots.label ).appendTo( this.$content );
    } else {
        $( '<b class="datamap-popup-title">' ).text( this.markerGroup.name ).appendTo( this.$content );
    }
    
    // Collect layer discriminators
    const discrims = [];
    this.markerLayers.forEach( ( layerId, index ) => {
        if ( index > 0 && this.map.config.layers[layerId] ) {
            discrims.push( this.map.config.layers[layerId].discrim );
        }
    } );

    // Coordinates
    // TODO: this is not displayed if coordinates are disabled
    let coordText = this.map.getCoordLabel( this.coords[0], this.coords[1] );
    if ( discrims.length > 0 ) {
        coordText += ` (${ discrims.join( ', ' ) })`;
    }
    if ( config.DataMapsShowCoordinatesDefault ) {
        $( '<div class="datamap-popup-coordinates">' ).text( coordText ).appendTo( this.$content );
    }

    // Description
    if ( this.slots.desc ) {
        if ( !this.slots.desc.startsWith( '<p>' ) ) {
            this.slots.desc = `<p>${this.slots.desc}</p>`;
        }
        this.$content.append( this.slots.desc );
    }

    // Image
    if ( this.slots.image ) {
        $( '<img class="datamap-popup-image" width=240 />' ).attr( 'src', this.slots.image ).appendTo( this.$content );
    }

    // Tools
    this.buildTools().appendTo( this.$content );

    return this.$content;
};


MarkerPopup.prototype.addTool = function ( cssClass, $child ) {
    return $( `<li class="${cssClass}">` ).append( $child ).appendTo( this.$tools );
};


MarkerPopup.prototype.buildTools = function () {
    // Related article
    const article = this.slots.article || this.markerGroup.article;
    if ( article ) {
        this.addTool( 'datamap-popup-seemore',
            $( '<a>' ).attr( 'href', mw.util.getUrl( article ) ).text( mw.msg( 'datamap-popup-related-article' ) ) );
    }

    // Dismissables
    if ( this.markerGroup.canDismiss ) {
        this.addTool( 'datamap-popup-dismiss',
            $( '<a>' )
                .text( this.getDismissToolText() )
                .on( 'click', () => {
                    this.map.toggleMarkerDismissal( this.markerType, this.coords, this.leafletMarker );
                    this.map.leaflet.closePopup();
                } )
        );
    }

    return this.$tools;
};


module.exports = MarkerPopup;