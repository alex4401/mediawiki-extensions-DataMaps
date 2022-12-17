const Enums = require( './enums.js' );
let Leaflet = null;


module.exports = {
    MAX_GROUP_CIRCLE_SIZE: 20,

    isBleedingEdge: require( './settings.json' ).DataMapsAllowExperimentalFeatures,


    /**
     * Returns whether a bit is set in a bit field.
     *
     * @param {number} a The field.
     * @param {number} b The bit.
     * @return {boolean}
     */
    isBitSet( a, b ) {
        return a && ( a & b ) === b;
    },


    /**
     * Returns whether the bit mask masks any bit in a bit field.
     *
     * @param {number} a The field.
     * @param {number} b The bit mask.
     * @return {boolean}
     */
    isAnyBitSet( a, b ) {
        return a && ( a & b ) !== 0;
    },


    /**
     * Retrieves Leaflet exports if they've been loaded.
     *
     * @return {Leaflet}
     */
    getLeaflet() {
        if ( Leaflet === null ) {
            Leaflet = require( 'ext.datamaps.leaflet' );
        }
        return Leaflet;
    },


    getGroupCollectibleType( group ) {
        return ( group.flags || 0 ) & Enums.MarkerGroupFlags.Collectible_Any;
    },


    createGroupIconElement( group ) {
        return $( '<img width=24 height=24 class="datamap-legend-group-icon" />' ).attr( 'src', group.legendIcon );
    },


    createGroupCircleElement( group ) {
        const size = Math.min( module.exports.MAX_GROUP_CIRCLE_SIZE, group.size + 4 );
        return $( '<div class="datamap-legend-circle">' ).css( {
            minWidth: size,
            width: size,
            height: size,
            backgroundColor: group.fillColor,
            borderColor: group.strokeColor || group.fillColor,
            borderWidth: group.strokeWidth || 1
        } );
    },


    /**
     * Generates an identifier of a marker using type and coordinates.
     *
     * @param {Leaflet.CircleMarker|Leaflet.Marker} leafletMarker Marker to get the identifier of.
     * @return {string}
     */
    getGeneratedMarkerId( leafletMarker ) {
        const type = leafletMarker.attachedLayers.join( ' ' );
        const out = `M${type}@${leafletMarker.apiInstance[ 0 ].toFixed( 3 )}:${leafletMarker.apiInstance[ 1 ].toFixed( 3 )}`;
        return out;
    },


    /**
     * Retrieves an identifier of a marker to use with local storage or in permanent links.
     *
     * @param {Leaflet.CircleMarker|Leaflet.Marker} leafletMarker Marker to get the identifier of.
     * @return {string|number}
     */
    getMarkerId( leafletMarker ) {
        return leafletMarker.apiInstance[ 2 ] && leafletMarker.apiInstance[ 2 ].uid
            || module.exports.getGeneratedMarkerId( leafletMarker );
    },


    /**
     * Retrieves a query (GET) parameter from current URL.
     *
     * @param {string} name Parameter name.
     * @return {string?}
     */
    getQueryParameter( name ) {
        // eslint-disable-next-line compat/compat
        return new URLSearchParams( window.location.search ).get( name );
    },


    /**
     * Constructs a URL with specified parameters (appended) and keeps TabberNeue's hash.
     *
     * @param {DataMap} map 
     * @param {Object} paramsToSet 
     * @param {boolean} [withHost]
     * @return {string}
     */
    makeUrlWithParams( map, paramsToSet, withHost ) {
        // eslint-disable-next-line compat/compat
        const params = new URLSearchParams( window.location.search );
        for ( const paramName in paramsToSet ) {
            if ( paramsToSet[ paramName ] ) {
                params.set( paramName, paramsToSet[ paramName ] );
            } else {
                params.delete( paramName );
            }
        }

        const tabber = module.exports.TabberNeue.getOwningId( map.$root );
        const hash = ( tabber ? ( '#' + tabber ) : window.location.hash );
        return ( withHost ? `https://${window.location.hostname}` : '' )
            + decodeURIComponent( `${window.location.pathname}?${params}`.replace( /\?$/, '' )
            + hash );
    },


    /**
     * Replaces current URL in the browser with a new URL with specified parameters and preserved TabberNeue hash.
     *
     * @param {DataMap} map 
     * @param {Object} paramsToSet 
     */
    updateLocation( map, paramsToSet ) {
        history.replaceState( {}, '', module.exports.makeUrlWithParams( map, paramsToSet, false ) );
    },


    TabberNeue: {
        getOwningPanel( $element ) {
            // TODO: use native functions
            const $panel = $element.closest( 'article.tabber__panel' );
            return $panel && $panel.length > 0 ? $panel : null;
        },


        getOwningTabber( $element ) {
            const $tabber = $element.closest( 'div.tabber' );
            return $tabber && $tabber.length > 0 ? $tabber : null;
        },


        /**
         * Finds ID of the TabberNeue tab this map is in. If not inside tabber, this will be null.
         *
         * @param {jQuery} $element
         * @return {string?}
         */
        getOwningId( $element ) {
            const $panel = module.exports.TabberNeue.getOwningPanel( $element );
            return $panel ? ( $panel.attr( 'id' ) || ( $panel.attr( 'data-title' ) )
                .replace( ' ', '_' ) ) : null;
        }
    }
};
