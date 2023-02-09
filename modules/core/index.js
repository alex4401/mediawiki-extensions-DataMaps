module.exports = Object.assign( {}, require( './enums.js' ), {
    EventEmitter: require( './events.js' ),
    Controls: require( './controls.js' ),
    MapStorage: require( './storage.js' ),
    MarkerLayerManager: require( './layerManager.js' ),
    MarkerPopup: require( './popup.js' ),
    LegendTabber: require( './legend/tabber.js' ),
    MarkerFilteringPanel: require( './legend/filters.js' ),
    DataMap: require( './map.js' ),
    CollectiblesPanel: require( './legend/collectibles.js' ),
    Util: require( './util.js' )
} );
