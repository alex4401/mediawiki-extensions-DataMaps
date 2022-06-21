var DataMap = require( './map.js' ),
    initialisedMaps = [],
    api = new mw.Api();

// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( function ( $content ) {
    var mapConfigs = mw.config.get( 'dataMaps' );

    // Broadcast all map IDs so gadgets can register to 
    mw.hook( 'ext.ark.datamaps.broadcastMaps' ).fire( Object.keys( mapConfigs ) );

    // Run initialisation for every map, followed by events for gadgets to listen to
    for ( var id in mapConfigs ) {
        var config = mapConfigs[id];
        mw.hook( 'ext.ark.datamaps.beforeInitialisation.' + id ).fire( config );
        var map = new DataMap( id, $content.find( '.datamap-container#datamap-' + id ), config );

        // Request markers from the API
        api.get( {
            action: 'queryDataMap',
            title: config.pageName,
            revid: config.version
         } ).then( function ( data ) {
            map.waitForLeaflet( map.instantiateMarkers.bind( map, data.query.markers ) );
        } ).then( function () {
            map.$root.find( '.datamap-status' ).remove();
        } );

        initialisedMaps.push( map );
        mw.hook( 'ext.ark.datamaps.afterInitialisation.' + id ).fire( map );
    }
} );
