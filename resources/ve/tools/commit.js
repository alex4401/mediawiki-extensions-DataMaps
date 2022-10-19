function CommitChangesTool( toolGroup, config ) {
    OO.ui.PopupTool.call( this, toolGroup, $.extend( { popup: {
        padded: true,
        label: mw.msg( 'datamap-ve-tool-commit' ),
        head: true
    } }, config ) );
}
OO.inheritClass( CommitChangesTool, OO.ui.PopupTool );
CommitChangesTool.static.name = 'commit';
CommitChangesTool.static.icon = 'check';
CommitChangesTool.static.title = mw.msg( 'datamap-ve-tool-commit' );


CommitChangesTool.prototype.onUpdateState = function ( event ) {
    this.ve = event.ve;
    this.map = event.ve.map;
};


module.exports = CommitChangesTool;