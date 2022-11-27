function CommitDialog( config ) {
    OO.ui.ProcessDialog.call( this, config );
}
OO.inheritClass( CommitDialog, OO.ui.ProcessDialog );


CommitDialog.static.name = 'mveCommitDialog';
CommitDialog.static.title = mw.msg( 'datamap-ve-tool-commit' );
CommitDialog.static.actions = [
    {
        modes: [ 'edit' ],
        action: 'continue',
        label: mw.msg( 'datamap-ve-tool-commit-continue' ),
        flags: [ 'primary', 'progressive' ]
    },
    {
        modes: [ 'edit' ],
        label: mw.msg( 'datamap-ve-cancel' ),
        flags: [ 'safe', 'close' ]
    }
];


CommitDialog.prototype.initialize = function () {
    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

    this.summaryInput = new OO.ui.TextInputWidget( {
        indicator: 'required'
    } );
    this.panel = new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        content: [
            $( '<p>' ).text( mw.msg( 'datamap-ve-tool-commit-intro' ) ),
            new OO.ui.FieldLayout( this.summaryInput, {
                label: mw.msg( 'datamap-ve-tool-commit-edit-summary' ),
                align: 'top',
                help: mw.msg( 'datamap-ve-tool-commit-edit-summary-subtext' ),
                helpInline: true
            } )
        ]
    } );

    this.$body.append( this.panel.$element );
};


// Set up the initial mode of the window ('edit', in this example.)
CommitDialog.prototype.getSetupProcess = function ( data ) {
    return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
        .next( () => this.actions.setMode( 'edit' ), this );
};


// Use the getActionProcess() method to set the modes and displayed item.
CommitDialog.prototype.getActionProcess = function ( action ) {
    if ( action === 'continue' ) {
        return new OO.ui.Process( () => this.close() );
    }
    return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
};


module.exports = CommitDialog;
