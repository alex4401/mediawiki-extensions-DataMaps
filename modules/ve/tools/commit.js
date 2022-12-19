const CommitDialog = require( '../dialogs/commit.js' ),
    DialogTool = require( './dialogTool.js' );


function CommitTool( toolGroup, config ) {
    DialogTool.call( this, toolGroup, config, CommitDialog );
}
OO.inheritClass( CommitTool, DialogTool );
CommitTool.static.name = 'commit';
CommitTool.static.icon = 'check';
CommitTool.static.title = mw.msg( 'datamap-ve-tool-commit' );


module.exports = CommitTool;
