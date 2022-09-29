function MapStorage( map, storageId ) {
    this.map = map;
    this.id = storageId || this.map.id;
    this.hasSchemaVersion = false;
    this.migrate();
    this.dismissed = this.getArray( 'dismissed' );
}


MapStorage.prototype.LATEST_VERSION = 20220929;


MapStorage.prototype.get = function ( name ) {
    return localStorage.getItem( `ext.ark.datamaps.${this.id}:${name}` );
};


MapStorage.prototype.set = function ( name, data ) {
    this.initialiseFirstWrite();
    localStorage.setItem( `ext.ark.datamaps.${this.id}:${name}`, data );
};


MapStorage.prototype.initialiseFirstWrite = function () {
    if ( !this.hasSchemaVersion ) {
        this.hasSchemaVersion = true;
        this.set( 'schemaVersion', MapStorage.prototype.LATEST_VERSION );
    }
};

    
MapStorage.prototype.getArray = function ( name ) {
    return JSON.parse( this.get( name ) || '[]' );
};

    
MapStorage.prototype.setObject = function ( name, data ) {
    this.set( name, JSON.stringify( data ) );
};


MapStorage.prototype.migrate = function () {
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
            break;
        case '20220803':
            shouldUpdateVersion = true;
            // Add marker namespace to every dismissed ID
            this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => 'M:' + x ) );
    }

    if ( shouldUpdateVersion ) {
        this.set( 'schemaVersion', MapStorage.prototype.LATEST_VERSION );
    }
};


MapStorage.prototype.isDismissed = function ( uid, isGroup ) {
    if ( this.dismissed.length === 0 ) {
        return false;
    }
    return this.dismissed.indexOf( ( isGroup ? 'G:' : 'M:' ) + uid ) >= 0;
};


MapStorage.prototype.toggleDismissal = function ( uid, isGroup ) {
    let out;
    uid = ( isGroup ? 'G:' : 'M:' ) + uid;
    if ( this.isDismissed( uid ) ) {
        this.dismissed = this.dismissed.filter( x => x != uid );
        out = false;
    } else {
        this.dismissed.push( uid );
        out = true;
    }
    this.setObject( 'dismissed', this.dismissed );
    return out;
};

    
module.exports = MapStorage;