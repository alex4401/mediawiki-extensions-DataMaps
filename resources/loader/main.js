const DataMap = require( './map.js' ),
    initialisedMaps = [],
    api = new mw.Api();


function finishMapInitialisation( map ) {
    // Request markers from the API
    const query = {
        action: 'queryDataMap',
        title: map.config.pageName,
        revid: map.config.version
    };
    if ( map.dataSetFilters ) {
        query.filter = map.dataSetFilters.join( '|' );
    }
    api.get( query )
        .then( data => map.waitForLeaflet( map.instantiateMarkers.bind( map, data.query.markers ) ) )
        .then( () => map.$root.find( '.datamap-status' ).remove() );
}


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    const mapConfigs = mw.config.get( 'dataMaps' );

    // Broadcast all map IDs so gadgets can register to 
    mw.hook( 'ext.ark.datamaps.broadcastMaps' ).fire( Object.keys( mapConfigs ) );

    // Run initialisation for every map, followed by events for gadgets to listen to
    for ( const id in mapConfigs ) {
        const config = mapConfigs[id];
        mw.hook( 'ext.ark.datamaps.beforeInitialisation.' + id ).fire( config );
        const map = new DataMap( id, $content.find( '.datamap-container#datamap-' + id ), config );

        // Hand off to another function. Lower risk of losing control over the reference.
        finishMapInitialisation( map );

        initialisedMaps.push( map );
        mw.hook( 'ext.ark.datamaps.afterInitialisation.' + id ).fire( map );
    }
} );
