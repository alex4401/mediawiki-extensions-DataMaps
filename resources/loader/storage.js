function MapStorage( map ) {
    this.map = map;
    this.dismissed = this.getArray( 'dismissed' );
}


MapStorage.prototype.get = function ( name ) {
    return localStorage.getItem( 'ext.ark.datamaps.' + this.map.id + ':' + name );
};


MapStorage.prototype.set = function ( name, data ) {
    localStorage.setItem( 'ext.ark.datamaps.' + this.map.id + ':' + name, data );
};

    
MapStorage.prototype.getArray = function ( name ) {
    return JSON.parse( this.get( name ) || '[]' );
};

    
MapStorage.prototype.setObject = function ( name, data ) {
    this.set( name, JSON.stringify(data) );
};


/*
 * Generates an identifier of a marker to use with local storage.
 */
MapStorage.prototype.getMarkerKey = function ( type, instance ) {
    return 'M' + type + '@' + instance[0] + ':' + instance[1];
};


MapStorage.prototype.isDismissed = function ( type, instance ) {
    if ( this.dismissed.length === 0 ) {
        return false;
    }
    return this.dismissed.indexOf( this.getMarkerKey( type, instance ) ) >= 0;
};


MapStorage.prototype.toggleDismissal = function ( type, instance ) {
    const key = this.getMarkerKey( type, instance );
    if ( this.isDismissed( type, instance ) ) {
        this.dismissed = this.dismissed.filter( x => x != key );
    } else {
        this.dismissed.push( key );
    }
    this.setObject( 'dismissed', this.dismissed );
};

    
module.exports = MapStorage;