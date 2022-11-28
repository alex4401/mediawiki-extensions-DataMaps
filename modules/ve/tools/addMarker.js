const AddMarkerDialog = require( '../dialogs/addMarker.js' );


function AddMarkerTool( toolGroup, config ) {
    OO.ui.Tool.call( this, toolGroup, config );
}
OO.inheritClass( AddMarkerTool, OO.ui.Tool );
AddMarkerTool.static.name = 'addMarker';
AddMarkerTool.static.icon = 'speechBubbleAdd';
AddMarkerTool.static.title = mw.msg( 'datamap-ve-tool-add-marker' );


AddMarkerTool.prototype.onSelect = function () {
    const dialog = new AddMarkerDialog( {
        size: 'medium',
        ve: this.ve
    } );
    this.ve.windowManager.addWindows( [ dialog ] );
    this.ve.windowManager.openWindow( dialog );
};


AddMarkerTool.prototype.onUpdateState = function ( event ) {
    this.ve = event.ve;
};


module.exports = AddMarkerTool;
