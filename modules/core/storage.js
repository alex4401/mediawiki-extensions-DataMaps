/**
 * Local storage interface class. It manages data migrations and handles writes.
 *
 * Since 2022/11/15 data is stored as a single object (the `data` field). Call `commit()` to write it to browser
 * storage.
 *
 * Version history:
 *   -1[*]      : Initial unversioned.
 *   20220713   : Internal "#surface" layer removed, dismissed markers needed it removed.
 *   20220803   : Fixed precision used on coordinates in generated marker identifiers.
 *   20220929   : Dismissal entries require a namespace G(roup) or M(arker), to support global dismissals without conflicts.
 *   20221114   : New model (single object).
 *   20221115   : Namespace changed from ext.ark.datamaps to ext.datamaps.
 */
class MapStorage {
    constructor( map, storageId ) {
        this.map = map;
        this.id = storageId || this.map.id;
        this.hasSchemaVersion = false;
        this.isWritable = true;
        this.migrate();

        this.data = this.getJSON( '*', '{}' );
        this.initialiseField( 'dismissed', [] );
        this.initialiseField( 'background', 0 );
    }


    initialiseField( name, value ) {
        if ( this.data[ name ] === undefined ) {
            this.data[ name ] = value;
        }
    }


    get( name, namespace ) {
        return localStorage.getItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
    }


    has( name, namespace ) {
        return Object.prototype.hasOwnProperty.call( localStorage, `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
    }


    remove( name, namespace ) {
        if ( this.isWritable ) {
            localStorage.removeItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
        }
    }


    set( name, data, namespace ) {
        if ( this.isWritable ) {
            this._initialiseVersioning();
            localStorage.setItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}`, data );
        }
    }


    rename( oldName, newName, oldNamespace ) {
        const value = this.get( oldName, oldNamespace || MapStorage.NAMESPACE );
        if ( value !== null ) {
            this.set( newName || oldName, value );
            this.remove( oldName, oldNamespace );
        }
    }


    _initialiseVersioning() {
        if ( !this.hasSchemaVersion ) {
            this.hasSchemaVersion = true;
            this.set( 'schemaVersion', MapStorage.LATEST_VERSION );
        }
    }


    getJSON( name, fallback ) {
        return JSON.parse( this.get( name ) || fallback );
    }


    setJSON( name, data ) {
        this.set( name, JSON.stringify( data ) );
    }


    commit() {
        this.setJSON( '*', this.data );
    }


    migrate() {
        // Move data from legacy namespace to the new one if saved prior to 20221115 - all keys that we use or used.
        // Schema version is not bumped right away, so migrations can still be done with no interruption (running on old
        // structures).
        if ( this.has( 'schemaVersion', MapStorage.LEGACY_NAMESPACE ) ) {
            this.rename( 'schemaVersion', null, MapStorage.LEGACY_NAMESPACE );
            this.rename( 'dismissed', null, MapStorage.LEGACY_NAMESPACE );
            this.rename( 'background', null, MapStorage.LEGACY_NAMESPACE );
        }

        const schemaVersion = parseInt( this.get( 'schemaVersion' ) || MapStorage.LATEST_VERSION );

        // Drop storage data prior to this version, we no longer support it
        if ( schemaVersion < MapStorage.MIN_SUPPORTED_VERSION ) {
            this.remove( 'schemaVersion' );
            this.remove( 'dismissed' );
            this.remove( 'background' );
            return;
        }

        // Check if version's older than current and if any saved properties exist; otherwise abort
        /* eslint-disable operator-linebreak */
        if ( schemaVersion < MapStorage.LATEST_VERSION && !( schemaVersion >= 20221114
            ? // Post-20221114: Single object model
            ( this.has( '*' ) )
            : // Pre-20221114: Separate keys model
            ( this.has( 'dismissed' ) || this.has( 'background' ) )
        ) ) {
            return;
        }
        /* eslint-enable operator-linebreak */

        this._upgradeFrom( schemaVersion );
    }


    _upgradeFrom( schemaVersion ) {
        // 20221115 migration is fundamental and runs ahead of all these

        // Convert loose properties onto a single object (20221114)
        if ( schemaVersion < 20221114 && !this.has( '*' ) ) {
            this.setJSON( '*', {
                dismissed: this.getJSON( 'dismissed', '[]' ),
                background: parseInt( this.get( 'background' ) || 0 )
            } );
            this.remove( 'dismissed' );
            this.remove( 'background' );
        }

        // Do not continue if there's no data object
        if ( !this.has( '*' ) ) {
            return;
        }

        const data = this.getJSON( '*', '{}' );
        // Run sequential migrations on the data object
        /* eslint-disable no-fallthrough */
        switch ( schemaVersion ) {
            case 20220713:
                // Parse dismissed marker IDs and use fixed precision on coordinates
                data.dismissed = data.dismissed.map( x => {
                    const a = x.split( '@' );
                    const b = a[ 1 ].split( ':' );
                    const lat = parseFloat( b[ 0 ] );
                    const lon = parseFloat( b[ 1 ] );
                    return ( isNaN( lat ) || isNaN( lon ) ) ? x : ( a[ 0 ] + '@' + lat.toFixed( 3 ) + ':' + lon.toFixed( 3 ) );
                } );
            case 20220803:
                // Add marker namespace to every dismissed ID
                data.dismissed = data.dismissed.map( x => 'M:' + x );
        }
        /* eslint-enable no-fallthrough */

        this._initialiseVersioning();
    }


    isDismissed( uid, isGroup ) {
        if ( this.data.dismissed.length === 0 ) {
            return false;
        }
        return this.data.dismissed.indexOf( ( isGroup ? 'G:' : 'M:' ) + uid ) >= 0;
    }


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


MapStorage.MIN_SUPPORTED_VERSION = 20220713;
MapStorage.LATEST_VERSION = 20221115;
MapStorage.NAMESPACE = 'ext.datamaps';
MapStorage.LEGACY_NAMESPACE = 'ext.ark.datamaps';


module.exports = MapStorage;
