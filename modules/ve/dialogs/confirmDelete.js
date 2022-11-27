function ConfirmDeleteDialog( config ) {
    OO.ui.ProcessDialog.call( this, config );
    this.introText = config.message;
    this.callback = config.callback;
}
OO.inheritClass( ConfirmDeleteDialog, OO.ui.ProcessDialog );


ConfirmDeleteDialog.static.name = 'mveConfirmDeleteDialog';
ConfirmDeleteDialog.static.title = mw.msg( 'datamap-ve-tool-confirm-delete' );
ConfirmDeleteDialog.static.actions = [
    {
        modes: [ 'main' ],
        action: 'continue',
        label: 'Delete',
        flags: [ 'destructive', 'progressive' ]
    },
    {
        modes: [ 'main' ],
        label: mw.msg( 'datamap-ve-cancel' ),
        flags: [ 'safe', 'close' ]
    }
];


ConfirmDeleteDialog.prototype.initialize = function () {
    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

    this.panel = new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        content: [
            $( '<p>' ).text( this.introText )
        ]
    } );

    this.$body.append( this.panel.$element );
};


ConfirmDeleteDialog.prototype.getSetupProcess = function ( data ) {
    return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
        .next( () => this.actions.setMode( 'main' ), this );
};


// Use the getActionProcess() method to set the modes and displayed item.
ConfirmDeleteDialog.prototype.getActionProcess = function ( action ) {
    if ( action === 'continue' ) {
        this.callback();
        return new OO.ui.Process( () => this.close() );
    }
    return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
};


module.exports = ConfirmDeleteDialog;
