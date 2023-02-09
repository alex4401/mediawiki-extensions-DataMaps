const
    /** @type {import( '../core' )} */ CoreModule = require( 'ext.datamaps.core' ),
    DataMap = CoreModule.DataMap,
    /** @type {typeof import( '../core/events.js' )} */ EventEmitter = CoreModule.EventEmitter,
    /** @type {import( '../core/map.js' )[]} */ initialisedMaps = [],
    /** @type {number[]} */ ids = [],
    /** @type {import( '../core/events.js' ).EventHandlerRef[]} */ toNotify = [];


/**
 * Looks for a configuration element and parses its contents as JSON.
 *
 * @param {HTMLElement} rootElement Root element of the map.
 * @return {DataMaps.Configuration.Map} Configuration object.
 */
function getConfig( rootElement ) {
    let config;
    const dataElement = rootElement.querySelector( ':scope > script[type="application/datamap+json"]' );
    if ( dataElement !== null ) {
        config = JSON.parse( /** @type {HTMLElement} */ ( dataElement ).innerText );
    }
    return config;
}


mw.dataMaps = {
    /**
     * @param {number} id
     * @param {HTMLElement} rootElement
     * @param {DataMaps.Configuration.Map} config
     * @return {import( '../core/map.js' )}
     */
    initialiseMapWithConfig( id, rootElement, config ) {
        // Set the map up
        const map = new DataMap( id, rootElement, config );

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
            EventEmitter.invokeHandler( handler, [ map ] );
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
    },


    /**
     * @param {( map: DataMap[] ) => void} callback
     * @param {any} [context]
     */
    onMapInitialised( callback, context ) {
        const handler = {
            method: callback,
            context
        };
        toNotify.push( handler );

        for ( const map of initialisedMaps ) {
            EventEmitter.invokeHandler( handler, [ map ] );
        }
    },


    /**
     * @param {( map: DataMap[] ) => void} callback
     * @param {any} [context]
     */
    registerMapAddedHandler( callback, context ) {
        this.onMapInitialised( callback, context );
    }
};


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    // Run initialisation for every map, followed by events for gadgets to listen to
    for ( const rootElement of /** @type {HTMLElement[]} */ ( $content.find( '.datamap-container[data-datamap-id]' ) ) ) {
        const id = parseInt( CoreModule.Util.getNonNull( rootElement.dataset.datamapId ) ),
            config = getConfig( rootElement );
        if ( config ) {
            ids.push( id );
            mw.dataMaps.initialiseMapWithConfig( id, rootElement, config );
        }
    }
} );
