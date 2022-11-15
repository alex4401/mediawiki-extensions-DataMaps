class MapStorage {
    constructor( map, storageId ) {
        this.map = map;
        this.id = storageId || this.map.id;
        this.hasSchemaVersion = false;
        this.isWritable = true;
        this.migrate();
        
        this.data = this.getObject( '*' );
    }


    get( name, namespace ) {
        return localStorage.getItem( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
    }


    has( name, namespace ) {
        return localStorage.hasOwnProperty( `${namespace || MapStorage.NAMESPACE}.${this.id}:${name}` );
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


    _initialiseVersioning() {
        if ( !this.hasSchemaVersion ) {
            this.hasSchemaVersion = true;
            this.set( 'schemaVersion', MapStorage.LATEST_VERSION );
        }
    }


    getArray( name ) {
        return JSON.parse( this.get( name ) || '[]' );
    }


    getObject( name ) {
        return JSON.parse( this.get( name ) || '{}' );
    }


    setObject( name, data ) {
        this.set( name, JSON.stringify( data ) );
    }


    migrate() {
        const schemaVersion = parseInt( this.get( 'schemaVersion' ) || MapStorage.LATEST_VERSION );

        // Drop storage data prior to this version, we no longer support it
        if ( schemaVersion < MapStorage.MIN_SUPPORTED_VERSION ) {
            this.remove( 'background' );
            this.remove( 'schemaVersion' );
            this.remove( 'dismissed' );
            return;
        }

        // Check if version's older than current and if any saved properties exist; otherwise abort
        if ( schemaVersion < MapStorage.LATEST_VERSION && !( schemaVersion >= 20221114 ?
            // Post-20221114: Single object model
            ( this.has( '*' ) )
            :
            // Pre-20221114: Separate keys model
            ( this.has( 'dismissed' ) || this.has( 'background' ) )
        ) ) {
            return;
        }

        this.hasSchemaVersion = true;
        let shouldUpdateVersion = false;

        switch ( schemaVersion ) {
            case 20220713:
                shouldUpdateVersion = true;
                // Parse dismissed marker IDs and use fixed precision on coordinates
                this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => {
                    const a = x.split( '@' );
                    const b = a[1].split( ':' );
                    const lat = parseFloat( b[0] );
                    const lon = parseFloat( b[1] );
                    return ( lat == NaN || lon == NaN ) ? x : ( a[0] + '@' + lat.toFixed( 3 ) + ':' + lon.toFixed( 3 ) );
                } ) );
            case 20220803:
                shouldUpdateVersion = true;
                // Add marker namespace to every dismissed ID
                this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => 'M:' + x ) );
            case 20220929:
                shouldUpdateVersion = true;
                this.setObject( '*', {
                    dismissed: this.getArray( 'dismissed' ),
                    background: this.get( 'background' ) || 0
                } );
                this.remove( 'dismissed' );
                this.remove( 'background' );
        }

        if ( shouldUpdateVersion ) {
            this.set( 'schemaVersion', MapStorage.LATEST_VERSION );
        }
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
            this.data.dismissed = this.data.dismissed.filter( x => x != uidPrefixed );
            out = false;
        } else {
            this.data.dismissed.push( uidPrefixed );
            out = true;
        }
        this.setObject( 'dismissed', this.data.dismissed );
        return out;
    }
}


MapStorage.MIN_SUPPORTED_VERSION = 20220713;
MapStorage.LATEST_VERSION = 20221115;
MapStorage.NAMESPACE = 'ext.datamaps';
MapStorage.LEGACY_NAMESPACE = 'ext.ark.datamaps';


module.exports = MapStorage;