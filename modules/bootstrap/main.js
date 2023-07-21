/** @typedef {import( '../core/events.js' ).EventHandlerRef & { flag: number }} MapNotificationReceiver */
const
    {
        DataMap,
        MapFlags,
        EventEmitter,
        Util
    } = require( 'ext.datamaps.core' ),
    /** @type {InstanceType<DataMap>[]} */ initialisedMaps = [],
    /** @type {MapNotificationReceiver[]} */ toNotifyOnInit = [],
    /** @type {MapNotificationReceiver[]} */ toNotifyOnDestroy = [];


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


/**
 * @param {MapNotificationReceiver} handler
 * @param {InstanceType<DataMap>} map
 */
function invokeHandler( handler, map ) {
    const isVe = map.isFeatureBitSet( MapFlags.VisualEditor );
    if ( ( isVe && handler.flag & mw.dataMaps.IS_COMPATIBLE_WITH_VISUAL_EDITOR )
        || ( !isVe && handler.flag & mw.dataMaps.IS_COMPATIBLE_WITH_NORMAL ) ) {
        EventEmitter.invokeHandler( handler, [ map ] );
    }
}


/**
 * @param {MapNotificationReceiver[]} list
 * @param {( map: InstanceType<DataMap> ) => void} callback
 * @param {any} [context]
 * @param {number} [filterFlags=mw.dataMaps.IS_COMPATIBLE_WITH_NORMAL]
 * @return {MapNotificationReceiver}
 */
function appendHandler( list, callback, context, filterFlags ) {
    const handler = {
        method: callback,
        context,
        flag: filterFlags || mw.dataMaps.IS_COMPATIBLE_WITH_NORMAL
    };
    list.push( handler );
    return handler;
}


/**
 * @global
 */
mw.dataMaps = {
    /**
     * @constant
     */
    IS_COMPATIBLE_WITH_NORMAL: 1,
    /**
     * @constant
     */
    IS_COMPATIBLE_WITH_VISUAL_EDITOR: 2,


    /**
     * @param {number} id
     * @param {HTMLElement} rootElement
     * @param {DataMaps.Configuration.Map} config
     * @return {InstanceType<DataMap>}
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
        // Pass the deactivation event to gadgets
        map.on( 'deactivate', () => {
            for ( const handler of toNotifyOnDestroy ) {
                invokeHandler( handler, map );
            }
        } );

        // Notify external scripts waiting on maps
        for ( const handler of toNotifyOnInit ) {
            invokeHandler( handler, map );
        }

        // Request markers from the API
        if ( map.config.version ) {
            map.setStatusOverlay( 'info', mw.msg( 'datamap-loading-data' ), true );
            map.streaming.loadSequential()
                .then( () => {
                    // Wait for Leaflet to be done loading before taking the overlay off
                    map.on( 'leafletLoadedLate', () => map.setStatusOverlay( null ) );
                } )
                .catch( () => map.setStatusOverlay( 'error', mw.msg( 'datamap-error-dataload' ), false ) );
        } else {
            // No page to request markers from, hide the status message
            map.setStatusOverlay( null );
        }

        return map;
    },


    /**
     * @param {( map: InstanceType<DataMap> ) => void} callback
     * @param {any} [context]
     * @param {number} [filterFlags=mw.dataMaps.IS_COMPATIBLE_WITH_NORMAL]
     */
    onMapInitialised( callback, context, filterFlags ) {
        const handler = appendHandler( toNotifyOnInit, callback, context, filterFlags );
        for ( const map of initialisedMaps ) {
            invokeHandler( handler, map );
        }
    },


    /**
     * @param {( map: InstanceType<DataMap> ) => void} callback
     * @param {any} [context]
     * @param {number} [filterFlags=mw.dataMaps.IS_COMPATIBLE_WITH_NORMAL]
     */
    onMapDeactivated( callback, context, filterFlags ) {
        appendHandler( toNotifyOnDestroy, callback, context, filterFlags );
    },


    /**
     * @param {( map: InstanceType<DataMap> ) => void} callback
     * @param {any} [context]
     */
    registerMapAddedHandler( callback, context ) {
        this.onMapInitialised( callback, context );
    }
};


// Begin initialisation once the document is loaded
mw.hook( 'wikipage.content' ).add( $content => {
    // Run initialisation for every map, followed by events for gadgets to listen to
    for ( const rootElement of /** @type {HTMLElement[]} */ ( $content.find( '.ext-datamaps-container[data-datamap-id]' ) ) ) {
        const id = parseInt( Util.getNonNull( rootElement.dataset.datamapId ) ),
            config = getConfig( rootElement );
        if ( config ) {
            mw.dataMaps.initialiseMapWithConfig( id, rootElement, config );
        }
    }
} );
