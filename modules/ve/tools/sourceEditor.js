const DialogTool = require( './dialogTool.js' ),
    SwitchToSourceDialog = require( '../dialogs/switchSource.js' );


function SourceEditorTool( toolGroup, config ) {
    DialogTool.call( this, toolGroup, config, SwitchToSourceDialog );
}
OO.inheritClass( SourceEditorTool, DialogTool );
SourceEditorTool.static.name = 'sourceEditor';
SourceEditorTool.static.icon = 'code';
SourceEditorTool.static.title = mw.msg( 'datamap-ve-tool-source-editor' );


module.exports = SourceEditorTool;
