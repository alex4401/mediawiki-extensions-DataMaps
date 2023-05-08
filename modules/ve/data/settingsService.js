/** @typedef {import( '../editor.js' )} MapVisualEditor */
const { DataMap } = require( 'ext.datamaps.core' ),
    { getOrDefault } = require( '../util.js' );


module.exports = class SettingsDataService {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        /**
         * @private
         * @type {MapVisualEditor}
         */
        this._editor = editor;
        /**
         * @private
         * @type {InstanceType<DataMap>}
         */
        this._map = this._editor.map;
    }


    /**
     * @return {import( '../../../schemas/src/MapSettings.js' ).MapSettings}
     */
    getData() {
        return getOrDefault( this._editor.getData(), 'settings', {} );
    }


    /**
     * @return {boolean}
     */
    prefersXyCoordinates() {
        const coordOrderValue = this._editor.getData().coordinateOrder || 'latlon';
        return coordOrderValue === 'xy' || coordOrderValue === 'yx';
    }


    /**
     * @return {boolean}
     */
    prefersYCoordinateFirst() {
        const coordOrderValue = this._editor.getData().coordinateOrder || 'latlon';
        return coordOrderValue === 'latlon' || coordOrderValue === 'yx';
    }
};
