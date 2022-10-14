module.exports = class MarkerStreamingManager {
    constructor( map ) {
        this.map = map;
        this.mwApi = new mw.Api();
    }

    callApiUnreliable( options ) {
        return this.mwApi.get( $.extend( {
            action: 'queryDataMap'
        }, options ) ).then(
            data => data.error ? Promise.reject( data.error ) : Promise.resolve( data ),
            reason => Promise.reject( reason )
        );
    }

    callApiReliable( options, retries, waitTime ) {
        retries = retries != null ? retries : 2;
        waitTime = waitTime || 60;
        return new Promise( ( resolve, reject ) => {
            return this.callApiUnreliable( options )
                .then( resolve )
                .catch( reason => {
                    if ( retries > 0 ) {
                        return new Promise( r => setTimeout( r, waitTime ) )
                            .then( this.callApiReliable.bind( this, options, retries - 1, waitTime ) )
                            .then( resolve )
                            .catch( reject );
                    }
                    return reject( reason );
                } );
        } );
    }


    requestChunk( pageName, version, filter, start, limit, sector ) {
        const query = {
            title: pageName
        };
        if ( version ) query.revid = version;
        if ( filter ) query.layers = filter.join( '|' );
        if ( start ) query.start = start;
        if ( limit ) query.limit = limit;
        if ( sector ) query.sector = sector;
        return this.callApiReliable( query );
    }


    loadChunk( pageName, version, filter, start, limit, sector ) {
        return this.requestChunk( pageName, version, filter, start, limit, sector )
            .then( data => {
                this.map.waitForLeaflet( () => {
                    this.map.instantiateMarkers( data.query.markers );
                } );
            } );
    }

    
    loadSequential( pageName, version, filter, start, sector ) {
        // TODO: API does not return continuation links yet
    }
}