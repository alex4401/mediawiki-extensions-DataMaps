/* eslint-disable compat/compat */
/** @typedef {import( './map.js' )} DataMap */


/**
 * Requests data from the extension's API
 */
module.exports = class MarkerStreamingManager {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        this.map = map;
        this.mwApi = new mw.Api();
    }


    /**
     * Retrieves data from the API. Default action is `queryDataMap`.
     *
     * @param {Object<string, string|number>} options
     * @return {any}
     */
    callApiUnreliable( options ) {
        return this.mwApi.get( $.extend( {
            action: 'queryDataMap'
        }, options ) ).then(
            data => data.error ? Promise.reject( data.error ) : Promise.resolve( data ),
            reason => Promise.reject( reason )
        );
    }


    /**
     * Retrieves data from the API, retrying a limited number of times until success assuming a single call may fail.
     *
     * @param {Object<string, string|number>} options
     * @param {number} retries Number of re-attempts. Defaults to 3.
     * @param {number} waitTime Wait time between retries, in milliseconds. Doubles on every attempt.
     * @return {any}
     */
    callApiReliable( options, retries, waitTime ) {
        retries = retries !== null ? retries : 2;
        waitTime = waitTime || 60;
        return new Promise( ( resolve, reject ) => {
            // eslint-disable-next-line no-promise-executor-return
            return this.callApiUnreliable( options )
                .then( resolve )
                .catch( reason => {
                    if ( retries > 0 ) {
                        // eslint-disable-next-line no-promise-executor-return
                        return new Promise( r => setTimeout( r, waitTime * 2 ) )
                            .then( this.callApiReliable.bind( this, options, retries - 1, waitTime * 2 ) )
                            .then( resolve )
                            .catch( reject );
                    }
                    return reject( reason );
                } );
        } );
    }


    requestChunk( pageId, version, filter, start, limit, sector ) {
        pageId = pageId || this.map.id;
        version = version || this.map.config.version;
        filter = filter || this.map.dataSetFilters;

        const query = {
            pageid: pageId
        };
        /* eslint-disable curly */
        if ( version ) query.revid = version;
        if ( filter ) query.layers = filter.join( '|' );
        if ( start !== null ) query.continue = start;
        if ( limit ) query.limit = limit;
        if ( sector ) query.sector = sector;
        /* eslint-enable curly */
        return this.callApiReliable( query );
    }


    /**
     * Creates instances of markers from an API response.
     *
     * Properties are extracted from ownership strings, and frozen, as they're shared between all instances within a data set.
     *
     * @param {Object<string, DataMaps.UncheckedApiMarkerInstance[]>} data
     */
    instantiateMarkers( data ) {
        // Register all layers in this package
        for ( const markerType in data ) {
            markerType.split( ' ' ).forEach( name => this.map.layerManager.register( name ) );
        }

        // Unpack markers
        const markers = [];
        for ( const markerType in data ) {
            const layers = markerType.split( ' ' ),
                placements = data[ markerType ];
            /** @type {Object<string, string>?} */
            let properties = null;

            // Extract properties (sub-layers) from the layers
            if ( markerType.indexOf( ':' ) > 0 ) {
                properties = {};
                for ( const layer of layers ) {
                    if ( layer.indexOf( ':' ) > 0 ) {
                        const [ key, value ] = layer.split( ':', 2 );
                        properties[ key ] = value;
                    }
                }
                properties = Object.freeze( properties );
            }

            // Create markers for instances
            for ( const instance of placements ) {
                markers.push( this.map.createMarkerFromApiInstance( layers, instance, properties ) );
            }
        }

        // Notify other components this chunk has been loaded, and send them all produced markers
        this.map.fire( 'chunkStreamed', markers );
    }


    loadChunk( pageId, version, filter, start, limit, sector ) {
        return this.requestChunk( pageId, version, filter, start, limit, sector )
            .then( data => {
                this.map.on( 'leafletLoaded', () => {
                    this.instantiateMarkers( data.query.markers );
                    this.map.fire( 'chunkStreamingDone' );
                } );
            } );
    }


    loadSequential( pageId, version, filter, start, sector ) {
        return this.requestChunk( pageId, version, filter, start || 0, null, sector )
            .then( data => {
                this.map.on( 'leafletLoaded', () => {
                    this.instantiateMarkers( data.query.markers );
                } );
                if ( data.query.continue ) {
                    return this.loadSequential( pageId, version, filter, data.query.continue );
                } else {
                    this.map.on( 'leafletLoaded', () => {
                        // Notify other components that all chunks have been streamed in this request
                        this.map.fire( 'chunkStreamingDone' );
                    } );
                }
            } );
    }
};
