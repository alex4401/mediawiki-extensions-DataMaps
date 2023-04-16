// @ts-nocheck
// No @extends support on ES5-style classes (https://github.com/microsoft/TypeScript/issues/36369)


/**
 * @class
 * @extends {OO.ui.PageLayout}
 *
 * @constructor
 * @param {string} name
 * @param {OO.ui.PageLayout.ConfigOptions} [config] Configuration options
 */
function NamedPageLayout( name, config ) {
    NamedPageLayout.super.call( this, name, config );
}


OO.inheritClass( NamedPageLayout, OO.ui.PageLayout );


NamedPageLayout.prototype.setupOutlineItem = function () {
    this.outlineItem.setLabel( this.name );
};


module.exports = NamedPageLayout;
