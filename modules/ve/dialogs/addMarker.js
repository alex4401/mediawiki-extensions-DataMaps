function AddMarkerDialog( config ) {
	OO.ui.ProcessDialog.call( this, config );
}
OO.inheritClass( AddMarkerDialog, OO.ui.ProcessDialog );


AddMarkerDialog.static.name = 'mveAddMarkerDialog';
AddMarkerDialog.static.title = mw.msg( 'datamap-ve-tool-add-marker' );
AddMarkerDialog.static.actions = [
	{
        modes: [ 'final' ],
		action: 'continue',
		label: mw.msg( 'datamap-ve-tool-add-marker-continue' ),
		flags: [ 'primary', 'progressive' ]
	},
	{
        modes: [ 'intro', 'final' ],
		label: mw.msg( 'datamap-ve-cancel' ),
		flags: [ 'safe', 'close' ]
	}
];


AddMarkerDialog.prototype.initialize = function () {
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
AddMarkerDialog.prototype.getSetupProcess = function ( data ) {
	return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
	    .next( () => this.actions.setMode( 'intro' ), this );
};


// Use the getActionProcess() method to set the modes and displayed item.
AddMarkerDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'continue' ) {
		return new OO.ui.Process( () => this.close() );
	}
	return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
};


module.exports = AddMarkerDialog;