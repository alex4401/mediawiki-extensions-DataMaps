function MapStorage( map ) {
    this.map = map;
    this.migrate();
    this.dismissed = this.getArray( 'dismissed' );
}


MapStorage.prototype.LATEST_VERSION = 20220713;


MapStorage.prototype.get = function ( name ) {
    return localStorage.getItem( `ext.ark.datamaps.${this.map.id}:${name}` );
};


MapStorage.prototype.set = function ( name, data ) {
    localStorage.setItem( `ext.ark.datamaps.${this.map.id}:${name}`, data );
};

    
MapStorage.prototype.getArray = function ( name ) {
    return JSON.parse( this.get( name ) || '[]' );
};

    
MapStorage.prototype.setObject = function ( name, data ) {
    this.set( name, JSON.stringify(data) );
};


MapStorage.prototype.migrate = function () {
    const schemaVersion = this.get( 'schemaVersion' ) || -1;
    let shouldUpdateVersion = false;

    switch ( schemaVersion ) {
        case -1:
            shouldUpdateVersion = true;
            // Drop the #surface layer from memorised dismissed markers
            this.setObject( 'dismissed', this.getArray( 'dismissed' ).map( x => x.replace( ' #surface', '' ) ) );
            break;
    }

    if ( shouldUpdateVersion ) {
        this.set( 'schemaVersion', MapStorage.prototype.LATEST_VERSION );
    }
};


/*
 * Generates an identifier of a marker to use with local storage.
 */
MapStorage.prototype.getMarkerKey = function ( type, instance ) {
    return `M${type}@${instance[0]}:${instance[1]}`;
};


MapStorage.prototype.isDismissed = function ( type, instance ) {
    if ( this.dismissed.length === 0 ) {
        return false;
    }
    return this.dismissed.indexOf( this.getMarkerKey( type, instance ) ) >= 0;
};


MapStorage.prototype.toggleDismissal = function ( type, instance ) {
    const key = this.getMarkerKey( type, instance );
    let out;
    if ( this.isDismissed( type, instance ) ) {
        this.dismissed = this.dismissed.filter( x => x != key );
        out = false;
    } else {
        this.dismissed.push( key );
        out = true;
    }
    this.setObject( 'dismissed', this.dismissed );
    return out;
};

    
module.exports = MapStorage;