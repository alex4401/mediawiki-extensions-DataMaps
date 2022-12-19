function SwitchToSourceDialog( config ) {
    OO.ui.ProcessDialog.call( this, config );
}
OO.inheritClass( SwitchToSourceDialog, OO.ui.ProcessDialog );


SwitchToSourceDialog.static.name = 'mveSwitchToSourceDialog';
SwitchToSourceDialog.static.title = mw.msg( 'datamap-ve-tool-confirm-delete' );
SwitchToSourceDialog.static.actions = [
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


SwitchToSourceDialog.prototype.initialize = function () {
    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

    this.panel = new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        content: [
            $( '<p>' ).text( mw.msg( 'datamap-ve-switch-to-source-confirm' ) )
        ]
    } );

    this.$body.append( this.panel.$element );
};


SwitchToSourceDialog.prototype.getSetupProcess = function ( data ) {
    return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
        .next( () => this.actions.setMode( 'main' ), this );
};


// Use the getActionProcess() method to set the modes and displayed item.
SwitchToSourceDialog.prototype.getActionProcess = function ( action ) {
    if ( action === 'continue' ) {
        return new OO.ui.Process( () => location.href = mw.util.getUrl( mw.config.get( 'wgPageName' ), {
            action: 'edit'
        } ) );
    }
    return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
};


module.exports = SwitchToSourceDialog;
