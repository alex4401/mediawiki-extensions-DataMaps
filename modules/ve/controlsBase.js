/** @typedef {import( './editor.js' )} MapVisualEditor */
const { Controls } = require( 'ext.datamaps.core' );


/**
 * @abstract
 */
module.exports = class VeControl extends Controls.MapControl {
    /**
     * @param {MapVisualEditor} editor Owning editor.
     * @param {string} id
     * @param {string} [tagName]
     * @param {string[]} [classes]
     */
    constructor( editor, id, tagName, classes ) {
        super( editor.map, id, {
            tagName,
            classes,
            delegatedBuild: true
        } );

        /** @type {MapVisualEditor} */
        this.editor = editor;

        this._build();
    }
};
