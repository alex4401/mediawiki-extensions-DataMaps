module.exports.isBleedingEdge = require( './settings.json' ).DataMapsAllowExperimentalFeatures;


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


module.exports.getQueryParameter = function ( name ) {
    return new URLSearchParams( window.location.search ).get( name );
};


module.exports.makeUrlWithParams = function ( map, paramsToSet, withHost ) {
    const params = new URLSearchParams( window.location.search );
    for ( const paramName in paramsToSet ) {
        if ( paramsToSet[paramName] ) {
            params.set( paramName, paramsToSet[paramName] );
        } else {
            params.delete( paramName );
        }
    }

    const tabber = map.getParentTabberNeueId();
    const hash = ( tabber ? ( '#' + tabber ) : window.location.hash );
    return ( withHost ? `https://${window.location.hostname}` : '' )
        + decodeURIComponent( `${window.location.pathname}?${params}`.replace( /\?$/, '' )
        + hash );
};


module.exports.updateLocation = function ( map, paramsToSet ) {
    history.replaceState( {}, '', module.exports.makeUrlWithParams( map, paramsToSet, false ) );
};