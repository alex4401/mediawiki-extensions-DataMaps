const initialisedMaps = [],
    ids = [];


function initialiseMapWithConfig( id, $root, config ) {
    // Broadcast `beforeInitialisation` hook that gadgets can register to
    mw.hook( `ext.ark.datamaps.beforeInitialisation.${id}` ).fire( config );

    // Set the map up
    const map = new mw.dataMaps.DataMap( id, $root, config );

    // Push onto internal tracking list
    initialisedMaps.push( map );

    // Broadcast `afterLegendInitialisation` hook that gadgets can register to
    map.on( 'legendLoaded', () => {
        mw.hook( `ext.ark.datamaps.afterLegendInitialisation.${id}` ).fire( map );
    } );

    // Set up a handler for linked events (broadcast to other maps)
    map.on( 'sendLinkedEvent', event => {
        event.map = map;
        for ( const otherMap of initialisedMaps ) {
            if ( map !== otherMap ) {
                otherMap.fire( 'linkedEvent', event );
            }
        }
    } );

    // Broadcast `afterInitialisation` hook that gadgets can register to
    mw.hook( `ext.ark.datamaps.afterInitialisation.${id}` ).fire( map );

    // Request markers from the API
    if ( map.config.version ) {
        map.streaming.loadSequential( id, map.config.version, map.dataSetFilters )
            .then( () => map.$status.hide() )
            .catch( () => map.$status.show().html( mw.msg( 'datamap-error-dataload' ) ).addClass( 'error' ) );
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
    // Run initialisation for every map, followed by events for gadgets to listen to
    $content.find( '.datamap-container' ).each( function () {
        const $root = $( this );
        const id = $root.data( 'datamap-id' ) || $root.attr( 'id' ).substr( 'datamap-'.length );
        const config = getConfig( id, $root );
        if ( config ) {
            ids.push( id );
            initialiseMapWithConfig( id, $root, config );
        }
    } );
} );


mw.dataMaps.subscribeHook = function ( hookName, callback ) {
    const ids = Object.keys( mw.config.get( 'dataMaps' ) );
    ids.forEach( id => mw.hook( 'ext.ark.datamaps.' + hookName + '.' + id ).add( callback ) );
};
