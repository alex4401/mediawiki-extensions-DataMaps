const Enums = require( './enums.js' );


module.exports = {
    MAX_GROUP_CIRCLE_SIZE: 20,

    isBleedingEdge: require( './settings.json' ).DataMapsAllowExperimentalFeatures,


    isBitSet: function ( a, b ) {
        return a && ( a & b ) == b;
    },


    isAnyBitSet: function ( a, b ) {
        return a && ( a & b ) !== 0;
    },


    getGroupCollectibleType: function ( group ) {
        return ( group.flags || 0 ) & ( Enums.MarkerGroupFlags.Collectible_Individual | Enums.MarkerGroupFlags.Collectible_Group
            | Enums.MarkerGroupFlags.Collectible_GlobalGroup );
    },


    createGroupIconElement: function ( group ) {
        return $( '<img width=24 height=24 class="datamap-legend-group-icon" />' ).attr( 'src', group.legendIcon );
    },


    createGroupCircleElement: function ( group ) {
        return $( '<div class="datamap-legend-circle">' ).css( {
            width: Math.min( module.exports.MAX_GROUP_CIRCLE_SIZE, group.size+4 ),
            height: Math.min( module.exports.MAX_GROUP_CIRCLE_SIZE, group.size+4 ),
            backgroundColor: group.fillColor,
            borderColor: group.strokeColor || group.fillColor,
            borderWidth: group.strokeWidth || 1,
        } );
    },


    /*
     * Generates an identifier of a marker using type and coordinates.
     */
    getGeneratedMarkerId: function ( leafletMarker ) {
        const type = leafletMarker.attachedLayers.join( ' ' );
        return `M${type}@${leafletMarker.apiInstance[0].toFixed(3)}:${leafletMarker.apiInstance[1].toFixed(3)}`;
    },


    /*
     * Retrieves an identifier of a marker to use with local storage or in permanent links.
     */
    getMarkerId: function ( leafletMarker ) {
        return leafletMarker.apiInstance[2] && leafletMarker.apiInstance[2].uid
            || module.exports.getGeneratedMarkerId( leafletMarker );
    },


    getQueryParameter: function ( name ) {
        return new URLSearchParams( window.location.search ).get( name );
    },


    makeUrlWithParams: function ( map, paramsToSet, withHost ) {
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
    },


    updateLocation: function ( map, paramsToSet ) {
        history.replaceState( {}, '', module.exports.makeUrlWithParams( map, paramsToSet, false ) );
    }
};