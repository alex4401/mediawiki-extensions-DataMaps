/** @typedef {import( './editor.js' )} MapVisualEditor */
/** @typedef {import( '../core/map.js' )} DataMap */


module.exports = class MapObjectFactory {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        /** @type {MapVisualEditor} */
        this.editor = editor;
        /** @type {DataMap} */
        this.map = editor.map;
    }


    createMarker( entity ) {

    }
};
