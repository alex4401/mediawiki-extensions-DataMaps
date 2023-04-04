function BetaWarningDialog( config ) {
    OO.ui.ProcessDialog.call( this, config );
}
OO.inheritClass( BetaWarningDialog, OO.ui.ProcessDialog );


BetaWarningDialog.static.name = 'mveBetaWarningDialog';
BetaWarningDialog.static.title = mw.msg( 'datamap-ve-dialog-beta-warning' );
BetaWarningDialog.static.actions = [
    {
        modes: [ 'main' ],
        label: mw.msg( 'datamap-ve-cancel' ),
        flags: [ 'safe', 'close' ]
    }
];


BetaWarningDialog.prototype.initialize = function () {
    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

    new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        content: [
            $( '<p>' ).html( mw.msg( 'datamap-ve-dialog-beta-warning-text' ) )
        ]
    } ).$element.appendTo( this.$body );
};


BetaWarningDialog.prototype.getSetupProcess = function ( data ) {
    return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
        .next( () => this.actions.setMode( 'main' ), this );
};


module.exports = BetaWarningDialog;
