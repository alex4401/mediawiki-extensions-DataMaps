module.exports = Object.assign( {}, require( './enums.js' ), {
    EventEmitter: require( './EventEmitter.js' ),
    Controls: require( './controls.js' ),
    MapStorage: require( './MapStorage.js' ),
    MarkerLayerManager: require( './MarkerLayerManager.js' ),
    MarkerPopup: require( './MarkerPopup.js' ),
    LegendTabber: require( './legend/LegendTabber.js' ),
    MarkerFilteringPanel: require( './legend/MarkerFilteringPanel.js' ),
    DataMap: require( './DataMap.js' ),
    CollectiblesPanel: require( './legend/CollectiblesPanel.js' ),
    Util: require( './Util.js' )
} );
