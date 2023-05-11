// @ts-nocheck
// No @extends support on ES5-style classes (https://github.com/microsoft/TypeScript/issues/36369)


/**
 * @class
 * @extends {OO.ui.FieldLayout}
 *
 * @constructor
 * @param {OO.ui.InputWidget} inputWidget
 * @param {OO.ui.FieldLayout.ConfigOptions} [config] Configuration options
 */
function FieldLayout( inputWidget, config ) {
    FieldLayout.super.call( this, inputWidget, config );
}


OO.inheritClass( FieldLayout, OO.ui.FieldLayout );


FieldLayout.prototype.setAlignment = function ( value ) {
    FieldLayout.super.prototype.setAlignment.call( this, value );
    if ( this.helpInline ) {
        this.$element.append( this.$help );
    }
    return this;
};


module.exports = FieldLayout;
