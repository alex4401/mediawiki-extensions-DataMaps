module.exports = function ( map ) {
    var self = {
        map: map,
    };


    self.get = function ( name ) {
        return localStorage.getItem( 'ext.ark.datamaps.' + self.map.id + ':' + name );
    };

    
    self.set = function ( name, data ) {
        localStorage.setItem( 'ext.ark.datamaps.' + self.map.id + ':' + name, data );
    };

    
    self.getArray = function ( name ) {
        return JSON.parse( self.get( name ) || '[]' );
    };

    
    self.setObject = function ( name, data ) {
        self.set( name, JSON.stringify(data) );
    };


    /*
     * Generates an identifier of a marker to use with local storage.
     */
    self.getMarkerKey = function ( type, instance ) {
        return 'M' + type + '@' + instance[0] + ':' + instance[1];
    };


    self.isDismissed = function ( type, instance ) {
        return self.dismissed.indexOf( self.getMarkerKey( type, instance ) ) >= 0;
    };


    self.toggleDismissal = function ( type, instance ) {
        var key = self.getMarkerKey( type, instance );
        if ( self.isDismissed( type, instance ) ) {
            self.dismissed = self.dismissed.filter( function ( x ) {
                return x != key;
            } );
        } else {
            self.dismissed.push( key );
        }
        self.setObject( 'dismissed', self.dismissed );
    };

    self.dismissed = self.getArray( 'dismissed' );
    
    return self;
};