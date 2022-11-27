const CommitDialog = require( '../dialogs/commit.js' );


function CommitTool( toolGroup, config ) {
    OO.ui.Tool.call( this, toolGroup, config );
}
OO.inheritClass( CommitTool, OO.ui.Tool );
CommitTool.static.name = 'commit';
CommitTool.static.icon = 'check';
CommitTool.static.title = mw.msg( 'datamap-ve-tool-commit' );


CommitTool.prototype.onSelect = function () {
    const dialog = new CommitDialog( {
        size: 'medium'
    } );
    this.ve.windowManager.addWindows( [ dialog ] );
    this.ve.windowManager.openWindow( dialog );
};


CommitTool.prototype.onUpdateState = function ( event ) {
    this.ve = event.ve;
};


module.exports = CommitTool;
