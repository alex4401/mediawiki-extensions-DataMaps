module.exports = mw.dataMaps = Object.assign( {}, require( './enums.js' ), {
    /** @deprecated since v0.15.0; will be removed in v0.16.0. All members are now available directly in the module export. */
    Enums: require( './enums.js' ),
    EventEmitter: require( './events.js' ),
    Controls: require( './controls.js' ),
    MapStorage: require( './storage.js' ),
    MarkerLayerManager: require( './layerManager.js' ),
    MarkerPopup: require( './popup.js' ),
    LegendTabManager: require( './legend.js' ),
    MarkerFilteringPanel: require( './markerLegend.js' ),
    DataMap: require( './map.js' ),
    CollectiblesPanel: require( './dismissables.js' ),
    Util: require( './util.js' )
} );
