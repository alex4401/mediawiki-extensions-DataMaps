/*
 * Generates an identifier of a marker using type and coordinates.
 */
module.exports.getGeneratedMarkerId = function ( leafletMarker ) {
    const type = leafletMarker.attachedLayers.join( ' ' );
    return `M${type}@${leafletMarker.apiInstance[0].toFixed(3)}:${leafletMarker.apiInstance[1].toFixed(3)}`;
};


/*
 * Retrieves an identifier of a marker to use with local storage or in permanent links.
 */
module.exports.getMarkerId = function ( leafletMarker ) {
    return leafletMarker.apiInstance[2] && leafletMarker.apiInstance[2].uid
        || module.exports.getGeneratedMarkerId( leafletMarker );
};


module.exports.isBleedingEdge = require( './settings.json' ).DataMapsAllowExperimentalFeatures;