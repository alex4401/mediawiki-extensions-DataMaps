const initialisedMaps = [],
    ids = [];


function initialiseMapWithConfig( id, $root, config ) {
    // Broadcast `beforeInitialisation` hook that gadgets can register to
    mw.hook( `ext.ark.datamaps.beforeInitialisation.${id}` ).fire( config );

    // Set the map up
    const map = new mw.dataMaps.DataMap( id, $root, config );

    // Push onto internal tracking list
    initialisedMaps.push( map );

    // Broadcast `afterInitialisation` hook that gadgets can register to
    mw.hook( `ext.ark.datamaps.afterInitialisation.${id}` ).fire( map );

    // Broadcast `afterLegendInitialisation` hook that gadgets can register to
    map.on( 'legendLoaded', () => {
        mw.hook( `ext.ark.datamaps.afterLegendInitialisation.${id}` ).fire( map );
    } );

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
        // DEPRECATED(0.12.0:0.14.0)
        config = mw.config.get( 'dataMaps' )[id];
    }
    return config;
}


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    if ( mw.config.get( 'dataMaps' ) ) {
        mw.hook( 'ext.ark.datamaps.broadcastMaps' ).fire( Object.keys( mw.config.get( 'dataMaps' ) ) );
    }
    
    // Run initialisation for every map, followed by events for gadgets to listen to
    $content.find( '.datamap-container' ).each( function () {
        const $root = $( this );
        const id = $root.attr( 'id' ).substr( 'datamap-'.length );
        const config = getConfig( id, $root );
        if ( config ) {
            ids.push( id );
            initialiseMapWithConfig( id, $root, config );
        }
    } );

    // Broadcast all map IDs so gadgets can register to
    // DEPRECATED(v0.12.0:v0.13.0)
    if ( !mw.config.get( 'dataMaps' ) ) {
        mw.hook( 'ext.ark.datamaps.broadcastMaps' ).fire( ids );
    }
} );


mw.dataMaps.subscribeHook = function ( hookName, callback ) {
    const ids = Object.keys( mw.config.get( 'dataMaps' ) );
    ids.forEach( id => mw.hook( 'ext.ark.datamaps.' + hookName + '.' + id ).add( callback ) );
};
