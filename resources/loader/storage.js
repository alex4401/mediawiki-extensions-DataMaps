class MapStorage {
    constructor( map, storageId ) {
        this.map = map;
        this.id = storageId || this.map.id;
        this.hasSchemaVersion = false;
        this.isWritable = true;
        this.migrate();
        
        this.dismissed = this.getArray( 'dismissed' );
    }


    get( name ) {
        return localStorage.getItem( `ext.ark.datamaps.${this.id}:${name}` );
    }


    set( name, data ) {
        if ( this.isWritable ) {
            this._initialiseVersioning();
            localStorage.setItem( `ext.ark.datamaps.${this.id}:${name}`, data );
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


    setObject( name, data ) {
        this.set( name, JSON.stringify( data ) );
    }


    migrate() {
        // Check if any saved properties exist, and if not, abort
        if ( !this.get( 'dismissed' ) ) {
            return;
        }

        const schemaVersion = this.get( 'schemaVersion' ) || -1;
        this.hasSchemaVersion = true;
        let shouldUpdateVersion = false;

        switch ( schemaVersion ) {
            case -1:
                shouldUpdateVersion = true;
                // Drop the #surface layer from memorised dismissed markers
                this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => x.replace( ' #surface', '' ) ) );
            case '20220713':
                shouldUpdateVersion = true;
                // Parse dismissed marker IDs and use fixed precision on coordinates
                this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => {
                    const a = x.split( '@' );
                    const b = a[1].split( ':' );
                    const lat = parseFloat( b[0] );
                    const lon = parseFloat( b[1] );
                    return ( lat == NaN || lon == NaN ) ? x : ( a[0] + '@' + lat.toFixed( 3 ) + ':' + lon.toFixed( 3 ) );
                } ) );
            case '20220803':
                shouldUpdateVersion = true;
                // Add marker namespace to every dismissed ID
                this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => 'M:' + x ) );
        }

        if ( shouldUpdateVersion ) {
            this.set( 'schemaVersion', MapStorage.LATEST_VERSION );
        }
    }


    isDismissed( uid, isGroup ) {
        if ( this.dismissed.length === 0 ) {
            return false;
        }
        return this.dismissed.indexOf( ( isGroup ? 'G:' : 'M:' ) + uid ) >= 0;
    }


    toggleDismissal( uid, isGroup ) {
        let out;
        const uidPrefixed = ( isGroup ? 'G:' : 'M:' ) + uid;
        if ( this.isDismissed( uid, isGroup ) ) {
            this.dismissed = this.dismissed.filter( x => x != uidPrefixed );
            out = false;
        } else {
            this.dismissed.push( uidPrefixed );
            out = true;
        }
        this.setObject( 'dismissed', this.dismissed );
        return out;
    }
}

    
MapStorage.LATEST_VERSION = 20220929;


module.exports = MapStorage;