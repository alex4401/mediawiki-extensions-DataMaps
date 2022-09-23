const MAX_GROUP_CIRCLE_SIZE = 20;


module.exports.isBleedingEdge = require( './settings.json' ).DataMapsAllowExperimentalFeatures;


module.exports.createGroupIconElement = function ( group ) {
    return $( '<img width=24 height=24 class="datamap-legend-group-icon" />' ).attr( 'src', group.legendIcon );
};


module.exports.createGroupCircleElement = function ( group ) {
    return $( '<div class="datamap-legend-circle">' ).css( {
        width: Math.min( MAX_GROUP_CIRCLE_SIZE, group.size+4 ),
        height: Math.min( MAX_GROUP_CIRCLE_SIZE, group.size+4 ),
        backgroundColor: group.fillColor,
        borderColor: group.strokeColor || group.fillColor,
        borderWidth: group.strokeWidth || 1,
    } );
};


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