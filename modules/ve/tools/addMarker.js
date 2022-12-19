const AddMarkerDialog = require( '../dialogs/addMarker.js' ),
    DialogTool = require( './dialogTool.js' );


function AddMarkerTool( toolGroup, config ) {
    DialogTool.call( this, toolGroup, config, AddMarkerDialog );
}
OO.inheritClass( AddMarkerTool, DialogTool );
AddMarkerTool.static.name = 'addMarker';
AddMarkerTool.static.icon = 'speechBubbleAdd';
AddMarkerTool.static.title = mw.msg( 'datamap-ve-tool-add-marker' );


module.exports = AddMarkerTool;
