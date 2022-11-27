function EditMarkerDialog( config ) {
    OO.ui.ProcessDialog.call( this, config );
}
OO.inheritClass( EditMarkerDialog, OO.ui.ProcessDialog );


EditMarkerDialog.static.name = 'mveEditMarkerDialog';
EditMarkerDialog.static.title = mw.msg( 'datamap-ve-tool-edit-marker' );
EditMarkerDialog.static.actions = [
    {
        modes: [ 'final' ],
        action: 'continue',
        label: mw.msg( 'datamap-ve-tool-edit-marker-continue' ),
        flags: [ 'primary', 'progressive' ]
    },
    {
        modes: [ 'intro', 'final' ],
        label: mw.msg( 'datamap-ve-cancel' ),
        flags: [ 'safe', 'close' ]
    }
];


EditMarkerDialog.prototype.initialize = function () {
    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

    this.panel = new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        content: [
            $( '<p>' ).text( mw.msg( 'datamap-ve-tool-add-marker-intro' ) )
        ]
    } );

    this.$body.append( this.panel.$element );
};


// Set up the initial mode of the window ('edit', in this example.)
EditMarkerDialog.prototype.getSetupProcess = function ( data ) {
    return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
        .next( () => this.actions.setMode( 'intro' ), this );
};


// Use the getActionProcess() method to set the modes and displayed item.
EditMarkerDialog.prototype.getActionProcess = function ( action ) {
    if ( action === 'continue' ) {
        return new OO.ui.Process( () => this.close() );
    }
    return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
};


module.exports = EditMarkerDialog;
