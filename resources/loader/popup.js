const Util = require( './util.js' );

const URL_PARAMETER = 'marker';


var getMarkerURL = function ( map, persistentMarkerId, withHost ) {
    const params = new URLSearchParams( window.location.search );
    if ( persistentMarkerId ) {
        params.set( URL_PARAMETER, persistentMarkerId );
    } else {
        params.delete( URL_PARAMETER );
    }

    const tabber = map.getParentTabberNeueId();
    return ( withHost ? `https://${window.location.hostname}` : '' )
        + decodeURIComponent( `${window.location.pathname}?${params}`.replace( /\?$/, '' )
        + ( tabber ? ( '#' + tabber ) : window.location.hash ) );
};


var updateLocation = function ( map, persistentMarkerId ) {
    history.replaceState( {}, '', getMarkerURL( map, persistentMarkerId ) );
};


function MarkerPopup( map, markerType, leafletMarker ) {
    this.map = map;
    this.markerType = markerType;
    this.leafletMarker = leafletMarker;
    this.markerGroup = map.config.groups[this.leafletMarker.attachedLayers[0]];
    this.slots = this.leafletMarker.apiInstance[2] || {};
    this.uid = Util.getMarkerId( this.leafletMarker );
    // These two containers are provided by L.Ark.Popup
    this.$buttons = null;
    this.$content = null;
    this.$tools = null;
}


MarkerPopup.URL_PARAMETER = URL_PARAMETER;


MarkerPopup.bindTo = function ( map, markerType, leafletMarker ) {
    leafletMarker.bindPopup( () => new MarkerPopup( map, markerType, leafletMarker ), {}, L.Ark.Popup );
};


MarkerPopup.prototype.getDismissToolText = function () {
    return mw.msg( 'datamap-popup-' + ( this.map.storage.isDismissed( this.uid ) ? 'dismissed' : 'mark-as-dismissed' ) );
};


MarkerPopup.prototype.buildButtons = function () {
    const $getLink = $( '<a class="datamap-marker-link-button oo-ui-icon-link" role="button"></a>' )
        .attr( {
            'title': mw.msg( 'datamap-popup-marker-link-get' ),
            'aria-label': mw.msg( 'datamap-popup-marker-link-get' ),
            'href': getMarkerURL( this.map, this.uid, true )
        } )
        .appendTo( this.$buttons )
        .on( 'click', event => {
            event.preventDefault();
            navigator.clipboard.writeText( $getLink.attr( 'href' ) )
                .then( () => mw.notify( mw.msg( 'datamap-popup-marker-link-copied' ) ) );
        } );
};


/*
 * Builds popup contents for a marker instance
 */
MarkerPopup.prototype.build = function () {
    // Build the title
    if ( this.slots.label && this.markerGroup.name !== this.slots.label ) {
        $( '<b class="datamap-popup-subtitle">' ).text( this.markerGroup.name ).appendTo( this.$content );
        $( '<b class="datamap-popup-title">' ).html( this.slots.label ).appendTo( this.$content );
    } else {
        $( '<b class="datamap-popup-title">' ).html( this.markerGroup.name ).appendTo( this.$content );
    }
    
    // Collect layer discriminators
    const discrims = [];
    this.leafletMarker.attachedLayers.forEach( ( layerId, index ) => {
        const layer = this.map.config.layers[layerId];
        if ( index > 0 && layer && layer.discrim ) {
            discrims.push( layer.discrim );
        }
    } );

    // Coordinates
    // TODO: this is not displayed if coordinates are disabled
    let coordText = this.map.getCoordLabel( this.leafletMarker.apiInstance );
    if ( discrims.length > 0 ) {
        coordText += ` (${ discrims.join( ', ' ) })`;
    }
    if ( this.map.isFeatureBitSet( this.map.FF_SHOW_COORDINATES ) ) {
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
};


MarkerPopup.prototype.addTool = function ( cssClass, $child ) {
    return $( `<li class="${cssClass}">` ).append( $child ).appendTo( this.$tools );
};


MarkerPopup.prototype.buildTools = function () {
    // Related article
    let article = this.slots.article || this.markerGroup.article;
    if ( article ) {
        let msg = mw.msg( 'datamap-popup-related-article' );
        if ( article.indexOf( '|' ) >= 0 ) {
            const split = article.split( '|', 2 );
            msg = split[1];
            article = split[0];
        }

        this.addTool( 'datamap-popup-seemore',
            $( '<a>' ).attr( 'href', mw.util.getUrl( article ) ).text( msg ) );
    }

    // Dismissables
    if ( this.markerGroup.canDismiss ) {
        this.addTool( 'datamap-popup-dismiss',
            $( '<a>' )
                .text( this.getDismissToolText() )
                .on( 'click', () => {
                    this.map.toggleMarkerDismissal( this.markerType, this.leafletMarker );
                    this.map.leaflet.closePopup();
                } )
        );
    }

    return this.$tools;
};


MarkerPopup.prototype.onAdd = function () {
    updateLocation( this.map, this.uid );
};


MarkerPopup.prototype.onRemove = function () {
    updateLocation( this.map, null );
};


module.exports = MarkerPopup;