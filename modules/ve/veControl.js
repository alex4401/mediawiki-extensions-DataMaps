const AddMarkerDialog = require( './dialogs/addMarker.js' ),
    { Controls } = require( 'ext.datamaps.core' );


module.exports = class MapVeIntegrationControl {
    constructor( ve ) {
        this.ve = ve;
        this.map = this.ve.map;

        this.$root = $( '<div class="leaflet-control datamap-ve-ic">' )
            .appendTo( this.map.$root.find( '.leaflet-control-container' ) );
        this.addMarkerBtn = new OO.ui.ButtonWidget( {
            icon: 'speechBubbleAdd',
            flags: [ 'progressive' ],
            framed: false
        } );
        this.addMarkerBtn.$element.appendTo( this.$root );
        this.$coords = $( '<span class="datamap-ve-ic-coords">' )
            .appendTo( this.$root );

        this.addMarkerBtn.on( 'click', this.openDialog, null, this );
        this.map.leaflet.on( 'click', this._onClick, this );
    }


    _onClick( event ) {
        // eslint-disable-next-line no-jquery/no-sizzle
        if ( this.$root.is( ':visible' ) ) {
            this.$root.hide();
            return;
        }

        this.$root.show();
        this.$root.css( {
            top: event.containerPoint.y,
            left: event.containerPoint.x
        } );

        let lat = event.latlng.lat / this.map.crsScaleY;
        const lon = event.latlng.lng / this.map.crsScaleX;
        if ( this.map.crsOrigin === Enums.CRSOrigin.TopLeft ) {
            lat = this.map.config.crs[ 1 ][ 0 ] - lat;
        }
        this.$coords.text( this.map.getCoordLabel( lat, lon ) );
    }


    openDialog() {
        const dialog = new AddMarkerDialog( {
            size: 'medium'
        } );
        this.ve.windowManager.addWindows( [ dialog ] );
        this.ve.windowManager.openWindow( dialog );
    }
};
