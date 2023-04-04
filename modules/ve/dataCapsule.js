const { EventEmitter, Util } = require( 'ext.datamaps.core' );


/** @typedef {import( '../../schemas/src/index' ).DataMap} Schema_DataMap */
/** @typedef {import( '../../schemas/src/index' ).MapSettings} Schema_MapSettings */


/**
 * @extends {EventEmitter<Record<string, DataMaps.EventHandling.EventListenerFn>>}
 */
class DataCapsule extends EventEmitter {
    constructor() {
        super();
        /**
         * @private
         * @type {Schema_DataMap?}
         */
        this._entityData = null;
    }


    /**
     * @template TObjectType
     * @template {keyof TObjectType} TKey
     * @param {TObjectType} obj
     * @param {TKey} key
     * @param {TObjectType[ TKey ]} defaultValue
     * @return {NonNullable< TObjectType[ TKey ] >}
     */
    static getField( obj, key, defaultValue ) {
        if ( obj[ key ] === undefined ) {
            obj[ key ] = defaultValue;
        }
        return /** @type {NonNullable< TObjectType[ TKey ] >} */ ( obj[ key ] );
    }


    /**
     * @param {Schema_DataMap?} data
     */
    set( data ) {
        this._entityData = data;
    }


    /**
     * @return {Schema_DataMap}
     */
    get() {
        return Util.getNonNull( this._entityData );
    }
}


module.exports = DataCapsule;
