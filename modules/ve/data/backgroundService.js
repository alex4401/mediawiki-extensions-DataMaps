/** @typedef {import( '../editor.js' )} MapVisualEditor */
/** @typedef {import( '../../../schemas/src/Marker.js' ).Marker} Schema_Marker */
const { DataMap } = require( 'ext.datamaps.core' ),
    { getOrDefault } = require( '../util.js' ),
    SettingsDataService = require( './settingsService.js' );


module.exports = class BackgroundDataService {
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
        /**
         * @private
         * @type {SettingsDataService}
         */
        this._settingsService = this._editor.getService( SettingsDataService );
    }


    getData() {
        return getOrDefault( this._editor.getData(), 'backgrounds', [] );
    }


    usesImageProperty() {
        return 'image' in this._editor.getData();
    }


    count() {
        if ( this.usesImageProperty() ) {
            return 1;
        }
        return this.getData().length;
    }


    /**
     * @return {string[]}
     */
    getNames() {
        if ( this.usesImageProperty() ) {
            return [ mw.msg( 'datamap-ve-background-default-name' ) ];
        }
        return Object.entries( this.getData() ).map( pair => pair[ 1 ].name );
    }


    /**
     * @param {number} index
     * @return {string?}
     */
    getMarkerLayerFor( index ) {
        if ( this.usesImageProperty() ) {
            return null;
        }
        return `bg:${this.getData()[ index ].markerLayerId || index}`;
    }
};
