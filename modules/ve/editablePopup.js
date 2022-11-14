const MarkerPopup = mw.dataMaps.MarkerPopup,
    EditMarkerDialog = require( './dialogs/editMarker.js' );


module.exports = class EditableMarkerPopup extends MarkerPopup {
    buildButtons() {
        const $edit = $( '<a class="datamap-marker-ve-edit-button oo-ui-icon-link" role="button"></a>' )
            .attr( {
                'title': mw.msg( 'datamap-ve-tool-edit-marker' ),
                'href': '#'
            } )
            .appendTo( this.$buttons )
            .on( 'click', event => {
                event.preventDefault();
                const dialog = new EditMarkerDialog( {
                    size: 'medium'
                } );
                this.slots.ve.windowManager.addWindows( [ dialog ] );
                this.slots.ve.windowManager.openWindow( dialog );
            } );
        super.buildButtons();
    }


    build() {
        const $placeholder = $( '<p>' ).text( mw.msg( 'datamap-ve-waiting-for-parse' ) ).appendTo( this.$content );
    }
}
