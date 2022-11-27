function SourceEditorTool( toolGroup, config ) {
    OO.ui.Tool.call( this, toolGroup, config );
}
OO.inheritClass( SourceEditorTool, OO.ui.Tool );
SourceEditorTool.static.name = 'sourceEditor';
SourceEditorTool.static.icon = 'code';
SourceEditorTool.static.title = mw.msg( 'datamap-ve-tool-source-editor' );


SourceEditorTool.prototype.onSelect = function () {
};


SourceEditorTool.prototype.onUpdateState = function ( event ) {
    this.ve = event.ve;
};


module.exports = SourceEditorTool;
