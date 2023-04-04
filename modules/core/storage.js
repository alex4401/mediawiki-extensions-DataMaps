/** @typedef {import( './map.js' )} DataMap */


/**
 * Local storage interface class. It manages data migrations and handles writes.
 *
 * Since 2022/11/15 data is stored as a single object (the `data` field). Call {@link MapStorage.commit} to write it to browser
 * storage.
 */
class MapStorage {
    /**
     * @param {DataMap} map Owning map.
     * @param {string?} [storageId] Key identifier (defaults to map page ID).
     */
    constructor( map, storageId ) {
        /**
         * Owning map.
         *
         * @type {DataMap}
         */
        this.map = map;
        /**
         * Identifier of this storage interface.
         *
         * @type {string}
         */
        this.id = `${storageId || this.map.id}`;
        /**
         * Whether browser's local storage holds a saved schema version for this interface's data.
         *
         * @private
         * @type {boolean}
         */
        this._hasSchemaVersion = false;
        /**
         * Whether this interface can write data to browser's local storage for persistence.
         *
         * @type {boolean}
         */
        this.isWritable = true;

        // Run data migrations and retrieve the data store object
        this._migrate();
        /**
         * Typed data store.
         *
         * @type {DataMaps.LocalMapUserData}
         */
        this.data = this._getJSON( '*', '{}' );
        // Initialise known fields
        this.initialiseField( 'dismissed', [] );
        this.initialiseField( 'background', 0 );
    }


    /**
     * Initialises a field if it does not exist in the data store object.
     *
     * @param {string} name Field name.
     * @param {any} value Value to initialise the field with.
     */
    initialiseField( name, value ) {
        if ( this.data[ name ] === undefined ) {
            this.data[ name ] = value;
        }
    }


    /**
     * Retrieves a field's value from browser's local storage.
     *
     * @private
     * @param {string} name Field name.
     * @param {string?} [namespace] Key namespace override. Defaults to {@link MapStorage.NAMESPACE}.
     * @return {any}
     */
    _get( name, namespace ) {
        return localStorage.getItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
    }


    /**
     * Checks whether a field has been saved in browser's local storage.
     *
     * @private
     * @param {string} name Field name.
     * @param {string?} [namespace] Key namespace override. Defaults to {@link MapStorage.NAMESPACE}.
     * @return {boolean}
     */
    _has( name, namespace ) {
        return Object.prototype.hasOwnProperty.call( localStorage, `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
    }


    /**
     * Removes a field from browser's local storage.
     *
     * @private
     * @param {string} name Field name.
     * @param {string?} [namespace] Key namespace override. Defaults to {@link MapStorage.NAMESPACE}.
     */
    _remove( name, namespace ) {
        if ( this.isWritable ) {
            localStorage.removeItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
        }
    }


    /**
     * Writes a field in the browser's local storage.
     *
     * @private
     * @param {string} name Field name.
     * @param {any} data Data to write.
     * @param {string?} [namespace] Key namespace override. Defaults to {@link MapStorage.NAMESPACE}.
     */
    _set( name, data, namespace ) {
        if ( this.isWritable ) {
            this._initialiseVersioning();
            localStorage.setItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}`, data );
        }
    }


    /**
     * Changes a field's name (copies data, removes old field) in the browser's local storage.
     *
     * @private
     * @param {string} oldName Old field name (to rename from).
     * @param {string?} [newName] New field name (to rename to). If blank, preserves original name for copies across namespaces.
     * @param {string?} [oldNamespace] Key namespace override. Defaults to {@link MapStorage.NAMESPACE}.
     */
    _rename( oldName, newName, oldNamespace ) {
        const value = this._get( oldName, oldNamespace || MapStorage.NAMESPACE );
        if ( value !== null ) {
            this._set( newName || oldName, value );
            this._remove( oldName, oldNamespace );
        }
    }


    /**
     * Writes latest schema version into browser's local storage if not done already.
     *
     * @private
     */
    _initialiseVersioning() {
        if ( !this._hasSchemaVersion ) {
            this._hasSchemaVersion = true;
            this._set( 'schemaVersion', MapStorage.LATEST_VERSION );
        }
    }


    /**
     * Reads a field from browser's local storage and parses it as JSON.
     *
     * @private
     * @param {string} name Field name.
     * @param {string} fallback Fallback value as string.
     * @return {any}
     */
    _getJSON( name, fallback ) {
        return JSON.parse( this._get( name ) || fallback );
    }


    /**
     * Serialises a field as JSON and writes it to browser's local storage.
     *
     * @private
     * @param {string} name Field name.
     * @param {any} data Data to write.
     */
    _setJSON( name, data ) {
        this._set( name, JSON.stringify( data ) );
    }


    /**
     * Writes the data object into browser's local storage.
     */
    commit() {
        this._setJSON( '*', this.data );
    }


    /**
     * Performs data migrations, supporting up to {@link MapStorage.MIN_SUPPORTED_VERSION}. If older than that, known keys are
     * removed from local storage and a blank state is adopted.
     *
     * @private
     */
    _migrate() {
        // v0.16.0 had a bugged namespace transition, recover from the `null` sub-namespace
        if ( this._has( 'schemaVersion', `${MapStorage.GENERIC_NAMESPACE}:null` ) ) {
            for ( const prop of [ 'schemaVersion', '*' ] ) {
                this._rename( prop, null, `${MapStorage.GENERIC_NAMESPACE}:null` );
            }
        }

        // Move data from legacy namespaces to the new one if saved prior to 20221115 or 20230331 - all keys that we use or used.
        // Schema version is not bumped right away, so migrations can still be done with no interruption (running on old
        // structures).
        const isLegacyNs = this._has( 'schemaVersion', MapStorage.LEGACY_NAMESPACE );
        if ( isLegacyNs || this._has( 'schemaVersion', MapStorage.GENERIC_NAMESPACE ) ) {
            for ( const prop of [ 'schemaVersion', '*', 'dismissed', 'background' ] ) {
                this._rename( prop, null, isLegacyNs ? MapStorage.LEGACY_NAMESPACE : MapStorage.GENERIC_NAMESPACE );
            }
        }

        const schemaVersion = parseInt( this._get( 'schemaVersion' ) || MapStorage.LATEST_VERSION );

        // Drop storage data prior to this version, we no longer support it
        if ( schemaVersion < MapStorage.MIN_SUPPORTED_VERSION ) {
            this._remove( 'schemaVersion' );
            this._remove( 'dismissed' );
            this._remove( 'background' );
            return;
        }

        // Check if current schema and abort
        if ( schemaVersion === MapStorage.LATEST_VERSION ) {
            return;
        }

        // Check if version's older than current and if any saved properties exist; otherwise abort
        /* eslint-disable operator-linebreak */
        if ( schemaVersion < MapStorage.LATEST_VERSION && !( schemaVersion >= 20221114
            ? // Post-20221114: Single object model
            ( this._has( '*' ) )
            : // Pre-20221114: Separate keys model
            ( this._has( 'dismissed' ) || this._has( 'background' ) )
        ) ) {
            return;
        }
        /* eslint-enable operator-linebreak */

        this._upgradeFrom( schemaVersion );
    }


    /**
     * @private
     * @param {string} id
     * @return {{ attached: string, lat: number, lon: number }?}
     */
    _parseGeneratedMarkerId( id ) {
        // Basic integrity check
        if ( id.indexOf( '@' ) > 0 && id.indexOf( ':' ) > 0 ) {
            const a = id.slice( 2 ).split( '@' );
            const b = a[ 1 ].split( ':' );
            const lat = parseFloat( b[ 0 ] );
            const lon = parseFloat( b[ 1 ] );
            return ( isNaN( lat ) || isNaN( lon ) ) ? null : {
                attached: a[ 0 ],
                lat,
                lon
            };
        }
        return null;
    }


    /**
     * Performs data migration from a given version to the {@link MapStorage.LATEST_VERSION current one}.
     *
     * This should not be called directly, as it may result in an invalid state or leave leftover data. Instead use
     * {@link MapStorage._migrate}, which runs necessary checks and important migrations first.
     *
     * @private
     * @param {number} schemaVersion
     */
    _upgradeFrom( schemaVersion ) {
        // 20221115 migration is fundamental and runs ahead of all these

        // Convert loose properties onto a single object (20221114)
        if ( schemaVersion < 20221114 && !this._has( '*' ) ) {
            this._setJSON( '*', {
                dismissed: this._getJSON( 'dismissed', '[]' ),
                background: parseInt( this._get( 'background' ) || 0 )
            } );
            this._remove( 'dismissed' );
            this._remove( 'background' );
        }

        // Do not continue if there's no data object
        if ( !this._has( '*' ) ) {
            return;
        }

        /** @type {DataMaps.LocalMapUserData} */
        const data = this._getJSON( '*', '{}' );

        // Run sequential migrations on the data object
        /* eslint-disable no-fallthrough */
        switch ( schemaVersion ) {
            case 20220713:
                // Parse dismissed marker IDs and use fixed precision on coordinates
                data.dismissed = data.dismissed.map( x => {
                    const info = this._parseGeneratedMarkerId( x );
                    return info === null ? x : ( info.attached + '@' + info.lat.toFixed( 3 ) + ':' + info.lon.toFixed( 3 ) );
                } );
            case 20220803:
                // Add marker namespace to every dismissed ID
                data.dismissed = data.dismissed.map( x => 'M:' + x );
            case 20221115:
                // Rid of extra M(arker) prefix in generated markers
                data.dismissed = data.dismissed.map( x =>
                    ( x.slice( 0, 3 ) === 'M:M' && this._parseGeneratedMarkerId( x.slice( 3 ) ) !== null ) ? `M:${x.slice( 3 )}`
                        : x );
        }
        /* eslint-enable no-fallthrough */

        this._initialiseVersioning();
        this._setJSON( '*', data );
    }


    /**
     * Checks whether a marker or a group has been dismissed.
     *
     * @param {string|number} uid Marker's unique identifier, or a group's identifier.
     * @param {boolean} isGroup
     * @return {boolean}
     */
    isDismissed( uid, isGroup ) {
        if ( this.data.dismissed.length === 0 ) {
            return false;
        }
        return this.data.dismissed.indexOf( ( isGroup ? 'G:' : 'M:' ) + uid ) >= 0;
    }


    /**
     * Toggles the collected status of a marker or a group.
     *
     * @param {string|number} uid Marker's unique identifier, or a group identifier.
     * @param {boolean} isGroup
     * @return {boolean} New collected status.
     */
    toggleDismissal( uid, isGroup ) {
        let out;
        const uidPrefixed = ( isGroup ? 'G:' : 'M:' ) + uid;
        if ( this.isDismissed( uid, isGroup ) ) {
            this.data.dismissed = this.data.dismissed.filter( x => x !== uidPrefixed );
            out = false;
        } else {
            this.data.dismissed.push( uidPrefixed );
            out = true;
        }
        this.commit();
        return out;
    }
}

/**
 * Current schema version.
 *
 * Version history:
 * - -1[*]      : Initial unversioned.
 * - 20220713   : Internal "#surface" layer removed, dismissed markers needed it removed.
 * - 20220803   : Fixed precision used on coordinates in generated marker identifiers.
 * - 20220929   : Dismissal entries require a namespace G(roup) or M(arker), to support global dismissals without conflicts.
 * - 20221114   : New model (single object).
 * - 20221115   : Namespace changed from ext.ark.datamaps to ext.datamaps.
 * - 20230228   : Generated marker IDs no longer include the M(arker) prefix. Storage has been namespaced for a while anyway.
 * - 20230331   : Namespace changed from ext.datamaps to ext.datamaps:[wiki id]
 *
 * @constant
 * @type {number}
 */
MapStorage.LATEST_VERSION = 20230331;
/**
 * Oldest version we can load.
 *
 * @constant
 * @type {number}
 */
MapStorage.MIN_SUPPORTED_VERSION = 20220713;
/**
 * Generic key prefix - without wiki ID.
 *
 * @constant
 * @type {string}
 */
MapStorage.GENERIC_NAMESPACE = 'ext.datamaps';
/**
 * Key prefix specific to this wiki.
 *
 * @constant
 * @type {string}
 */
MapStorage.NAMESPACE = `${MapStorage.GENERIC_NAMESPACE}:${mw.config.get( 'wgWikiID' )}`;
/**
 * Key prefix from before 20221115.
 *
 * @constant
 * @type {string}
 */
MapStorage.LEGACY_NAMESPACE = 'ext.ark.datamaps';


module.exports = MapStorage;
