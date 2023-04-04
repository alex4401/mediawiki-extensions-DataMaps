/** @typedef {import( './editor.js' )} MapVisualEditor */
/** @typedef {import( '../core/map.js' )} DataMap */


/**
 * @abstract
 * @template T
 */
class DataEntity {
    /**
     * @param {T} raw
     */
    constructor( raw ) {
        this._stale = false;
    }
}


module.exports = {
    /**
     * @typedef {Object} MarkerSourceData
     */

    /**
     * @extends {DataEntity<MarkerSourceData>}
     */
    MarkerDataEntity: class MarkerDataEntity extends DataEntity {
        /**
         * @param {MarkerSourceData} raw
         */
        constructor( raw ) {
            super( raw );
        }
    }
};
