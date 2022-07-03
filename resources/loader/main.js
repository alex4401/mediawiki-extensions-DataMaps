const DataMap = require( './map.js' ),
    initialisedMaps = [],
    api = new mw.Api();


function initialiseMapFromStore( id, $root ) {
    const config = mw.config.get( 'dataMaps' )[id];

    // Broadcast `beforeInitialisation` event that gadgets can register to
    mw.hook( 'ext.ark.datamaps.beforeInitialisation.' + id ).fire( config );

    // Set the map up
    const map = new DataMap( id, $root, config );

    // Push onto internal tracking list
    initialisedMaps.push( map );

    // Status overlay DOM element
    const $status = $root.find( '.datamap-status' );

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
        .then(
            data => {
                map.waitForLeaflet( map.instantiateMarkers.bind( map, data.query.markers ) );
                $status.remove();
            },
            () => $status.html( mw.msg( 'datamap-error-dataload' ) ).addClass( 'error' )
        );

    // Broadcast `afterInitialisation` event
    mw.hook( 'ext.ark.datamaps.afterInitialisation.' + id ).fire( map );

    return map;
}


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    const ids = Object.keys( mw.config.get( 'dataMaps' ) );

    // Broadcast all map IDs so gadgets can register to 
    mw.hook( 'ext.ark.datamaps.broadcastMaps' ).fire( Object.keys( ids ) );

    // Run initialisation for every map, followed by events for gadgets to listen to
    ids.forEach( id => initialiseMapFromStore( id, $content.find( '.datamap-container#datamap-' + id ) ) );
} );


module.exports = initialiseMapFromStore;