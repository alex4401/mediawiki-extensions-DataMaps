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


MarkerPopup.prototype.getDismissToolText = function () {
    return mw.msg( 'datamap-popup-' + ( this.map.storage.isDismissed( this.markerType, this.coords )
        ? 'dismissed' : 'mark-as-dismissed' ) );
};


/*
 * Builds popup contents for a marker instance
 */
MarkerPopup.prototype.build = function () {
    // Build the title
    var title = this.markerGroup.name;
    if ( this.slots.label ) {
        title += ": " + this.slots.label;
    }
    $( '<b class="datamap-popup-title">' ).text( title ).appendTo( this.$content );

    // Coordinates
    var coordText = this.map.getCoordLabel( this.coords[0], this.coords[1] );
    if ( this.markerLayers.indexOf( 'cave' ) >= 0 ) {
        coordText += mw.msg( 'datamap-popup-inside-cave' );
    }
    $( '<div class="datamap-popup-coordinates">' ).text( coordText ).appendTo( this.$content );

    // Description
    if ( this.slots.desc ) {
        if ( !this.slots.desc.startsWith( '<p>' ) ) {
            this.slots.desc = '<p>'+this.slots.desc+'</p>';
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
    return $( '<li class="' + cssClass + '">' ).append( $child ).appendTo( this.$tools );
};


MarkerPopup.prototype.buildTools = function () {
    // Related article
    var article = this.slots.article || this.markerGroup.article;
    if ( article ) {
        this.addTool( 'datamap-popup-seemore',
            $( '<a>' ).attr( 'href', mw.util.getUrl( article ) ).text( mw.msg( 'datamap-popup-related-article' ) ) );
    }

    // Dismissables
    if ( this.markerGroup.canDismiss ) {
        var self = this; // closures introduce their own context for `this`
        this.addTool( 'datamap-popup-dismiss',
            $( '<a>' )
                .text( this.getDismissToolText() )
                .on( 'click', function () {
                    self.map.storage.toggleDismissal( self.markerType, self.coords );
                    self.map.readyMarkerVisuals( self.markerType, self.markerGroup, self.coords, self.leafletMarker );
                    self.map.leaflet.closePopup();
                } )
        );
    }

    return this.$tools;
};


module.exports = MarkerPopup;