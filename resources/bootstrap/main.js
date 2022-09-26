const initialisedMaps = [];


function initialiseMapWithConfig( id, $root, config ) {
    // Broadcast `beforeInitialisation` event that gadgets can register to
    mw.hook( `ext.ark.datamaps.beforeInitialisation.${id}` ).fire( config );

    // Set the map up
    const map = new mw.dataMaps.DataMap( id, $root, config );

    // Push onto internal tracking list
    initialisedMaps.push( map );

    // Request markers from the API
    if ( map.config.pageName && map.config.version ) {
        map.streamMarkersIn( map.config.pageName, map.config.version, map.dataSetFilters,
            () => map.$status.hide(),
            () => map.$status.show().html( mw.msg( 'datamap-error-dataload' ) ).addClass( 'error' ) );
    } else {
        // No page to request markers from, hide the status message
        map.$status.hide();
    }

    return map;
}


function getConfig( id, $root ) {
    let config;
    const $data = $root.find( '> script[type="application/json+datamap"]' );
    if ( $data.length > 0 ) {
        config = JSON.parse( $data.text() );
    } else {
        // DEPRECATED(0.12.0:0.13.0)
        config = mw.config.get( 'dataMaps' )[id];
    }
    return config;
}


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    const ids = Object.keys( mw.config.get( 'dataMaps' ) );

    // Broadcast all map IDs so gadgets can register to 
    mw.hook( 'ext.ark.datamaps.broadcastMaps' ).fire( ids );

    // Run initialisation for every map, followed by events for gadgets to listen to
    ids.forEach( id => {
        const $root = $content.find( `.datamap-container#datamap-${id}` );
        const config = getConfig( id, $root );
        if ( config ) {
            initialiseMapWithConfig( id, $root, config );
        }
    } );
} );


mw.dataMaps.subscribeHook = function ( hookName, callback ) {
    const ids = Object.keys( mw.config.get( 'dataMaps' ) );
    ids.forEach( id => mw.hook( 'ext.ark.datamaps.' + hookName + '.' + id ).add( callback ) );
};
