const initialisedMaps = [],
    ids = [],
    toNotify = [];


function initialiseMapWithConfig( id, $root, config ) {
    // Set the map up
    const map = new mw.dataMaps.DataMap( id, $root, config );

    // Push onto internal tracking list
    initialisedMaps.push( map );

    // Set up a handler for linked events (broadcast to other maps)
    map.on( 'sendLinkedEvent', event => {
        event.map = map;
        for ( const otherMap of initialisedMaps ) {
            if ( map !== otherMap ) {
                otherMap.fire( 'linkedEvent', event );
            }
        }
    } );

    // Notify external scripts waiting on maps
    for ( const handler of toNotify ) {
        // eslint-disable-next-line no-underscore-dangle
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


/**
 * Looks for a configuration element and parses its contents as JSON.
 *
 * @param {Element} $root Root element of the map.
 * @return {Object} Configuration object.
 */
function getConfig( $root ) {
    let config;
    const $data = $root.find( '> script[type="application/datamap+json"]' );
    if ( $data.length > 0 ) {
        config = JSON.parse( $data.text() );
    }
    return config;
}


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    // Run initialisation for every map, followed by events for gadgets to listen to
    $content.find( '.datamap-container[data-datamap-id]' ).each( function () {
        const $root = $( this );
        const id = $root.data( 'datamap-id' );
        const config = getConfig( $root );
        if ( config ) {
            ids.push( id );
            initialiseMapWithConfig( id, $root, config );
        }
    } );
} );


mw.dataMaps.registerMapAddedHandler = function ( callback, context ) {
    const handler = {
        method: callback,
        context
    };
    toNotify.push( handler );

    for ( const map of initialisedMaps ) {
        // eslint-disable-next-line no-underscore-dangle
        mw.dataMaps.EventEmitter.prototype._invokeEventHandler( handler, [ map ] );
    }
};
