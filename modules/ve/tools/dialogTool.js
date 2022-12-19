/**
 * @abstract
 */
function DialogTool( toolGroup, config, dialogClass ) {
    OO.ui.Tool.call( this, toolGroup, config );
    this._dialogClass = dialogClass;
}
OO.inheritClass( DialogTool, OO.ui.Tool );


DialogTool.prototype.onSelect = function () {
    const dialog = new ( this._dialogClass )( $.extend( {
        size: 'medium'
    }, this.getDialogConfig() ) );
    this.ve.windowManager.addWindows( [ dialog ] );
    this.ve.windowManager.openWindow( dialog );
};


DialogTool.prototype.getDialogConfig = function () {
    return {};
};


DialogTool.prototype.onUpdateState = function ( event ) {
    this.ve = event.ve;
};


module.exports = DialogTool;
