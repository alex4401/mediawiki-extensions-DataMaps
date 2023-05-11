// @ts-nocheck
// No @extends support on ES5-style classes (https://github.com/microsoft/TypeScript/issues/36369)


/**
 * @class
 * @extends {mw.widgets.MediaResultWidget}
 *
 * @constructor
 * @param {any} [config] Configuration options
 */
function MediaResultWidget( config ) {
    MediaResultWidget.super.call( this, config );
}


OO.inheritClass( MediaResultWidget, mw.widgets.MediaResultWidget );


/**
 * @param {Object} originalDimensions Original image dimensions with width and height values
 * @param {Object} [boundingBox] Specific bounding box, if supplied
 */
MediaResultWidget.prototype.calculateSizing = function ( originalDimensions, boundingBox ) {
    this.imageDimensions = {
        width: originalDimensions.thumbwidth / originalDimensions.thumbheight * 36,
        height: 36
    };
    this.$thumb.css( this.imageDimensions );
};


module.exports = MediaResultWidget;
