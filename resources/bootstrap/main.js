const initialisedMaps = [],
    ids = [],
    toNotify = [];


function initialiseMapWithConfig( id, $root, config ) {
    /* DEPRECATED(v0.13.0:v0.14.0): use registerMapAddedHandler */
    // Broadcast `beforeInitialisation` hook that gadgets can register to
    mw.hook( `ext.ark.datamaps.beforeInitialisation.${id}` ).fire( config );

    // Set the map up
    const map = new mw.dataMaps.DataMap( id, $root, config );

    // Push onto internal tracking list
    initialisedMaps.push( map );

    /* DEPRECATED(v0.13.0:v0.14.0): use registerMapAddedHandler */
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

    /* DEPRECATED(v0.13.0:v0.14.0): use registerMapAddedHandler */
    // Broadcast `afterInitialisation` hook that gadgets can register to
    mw.hook( `ext.ark.datamaps.afterInitialisation.${id}` ).fire( map );

    // Notify external scripts waiting on maps
    for ( const handler of toNotify ) {
        mw.dataMaps.EventEmitter.prototype._invokeEventHandler( handler, [ map ] );
    }

    // Request markers from the API
    if ( map.config.version ) {
        map.streaming.loadSequential()
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
    const $data = $root.find( '> script[type="application/datamap+json"]' );
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


mw.dataMaps.registerMapAddedHandler = function ( callback, context ) {
    const handler = {
        method: callback,
        context: context
    };
    toNotify.push( handler );

    for ( const map of initialisedMaps ) {
        mw.dataMaps.EventEmitter.prototype._invokeEventHandler( handler, [ map ] );
    }
};


/* DEPRECATED(v0.13.0:v0.14.0): use registerMapAddedHandler */
mw.dataMaps.subscribeHook = function ( hookName, callback ) {
    mw.dataMaps.registerMapAddedHandler( map => {
        mw.hook( 'ext.ark.datamaps.' + hookName + '.' + map.id ).add( callback );
    } );
};
