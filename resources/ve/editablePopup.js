const MarkerPopup = mw.dataMaps.MarkerPopup,
    EditMarkerDialog = require( './dialogs/editMarker.js' );
const origBuild = MarkerPopup.prototype.build,
    origBuildButtons = MarkerPopup.prototype.buildButtons;


MarkerPopup.prototype.buildButtons = function () {
    if ( this.slots.ve ) {
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
        origBuildButtons.call( this );
    } else {
        origBuildButtons.call( this );
    }
}



MarkerPopup.prototype.build = function () {
    if ( this.slots.ve ) {
        const $placeholder = $( '<p>' ).text( mw.msg( 'datamap-ve-waiting-for-parse' ) ).appendTo( this.$content );

        //origBuild.call( this );
    } else {
        origBuild.call( this );
    }
};