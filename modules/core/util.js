/** @typedef {import( './map.js' )} DataMap */
const Enums = require( './enums.js' );

/** @type {LeafletModule?} */
let Leaflet = null;


module.exports = {
    MAX_GROUP_CIRCLE_SIZE: 20,

    isBleedingEdge: require( './settings.json' ).DataMapsAllowExperimentalFeatures,


    /**
     * Returns whether a bit is set in a bit field.
     *
     * @param {number|undefined?} a The field.
     * @param {number} b The bit.
     * @return {boolean}
     */
    isBitSet( a, b ) {
        return !!a && ( a & b ) === b;
    },


    /**
     * Returns whether the bit mask masks any bit in a bit field.
     *
     * @param {number|undefined?} a The field.
     * @param {number} b The bit mask.
     * @return {boolean}
     */
    isAnyBitSet( a, b ) {
        return !!a && ( a & b ) !== 0;
    },


    /**
     * Retrieves Leaflet exports if they've been loaded.
     *
     * @return {LeafletModule}
     */
    getLeaflet() {
        if ( Leaflet === null ) {
            Leaflet = require( 'ext.datamaps.leaflet' );
        }
        return /** @type {LeafletModule} */ ( Leaflet );
    },


    /**
     * @param {DataMaps.Configuration.MarkerGroup} group
     * @return {number}
     */
    getGroupCollectibleType( group ) {
        return ( group.flags || 0 ) & Enums.MarkerGroupFlags.Collectible_Any;
    },


    /**
     * @param {DataMaps.Configuration.MarkerGroup} group
     * @return {jQuery}
     */
    createGroupIconElement( group ) {
        return $( '<img width=24 height=24 class="datamap-legend-group-icon" />' ).attr( 'src',
            /** @type {!string} */ ( group.legendIcon ) );
    },


    /**
     * @param {DataMaps.Configuration.PinMarkerGroup} group
     * @return {jQuerySVG}
     */
    createGroupPinIconElement( group ) {
        return $( this.createPinIconElement( group.pinColor ) ).attr( {
            class: 'datamap-legend-group-icon',
            width: 24,
            height: 24
        } );
    },


    /**
     * @param {DataMaps.Configuration.CircleMarkerGroup} group
     * @return {jQuery}
     */
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
     * @param {string} colour
     * @return {SVGElement}
     */
    createPinIconElement( colour ) {
        const root = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
        root.setAttribute( 'viewBox', '0 0 20 20' );
        const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
        path.setAttribute( 'd', 'M 10,0 C 5.4971441,-0.21118927 1.7888107,3.4971441 2,8 c 0,2.52 2,5 3,6 1,1 5,6 5,6 0,0 4,-5 5,'
            + '-6 1,-1 3,-3.48 3,-6 0.211189,-4.5028559 -3.497144,-8.21118927 -8,-8 z' );
        const circle = document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' );
        circle.setAttribute( 'cx', '10' );
        circle.setAttribute( 'cy', '8' );
        circle.setAttribute( 'r', '3.3' );
        circle.setAttribute( 'fill', '#0009' );
        root.appendChild( path );
        root.appendChild( circle );

        if ( colour ) {
            root.setAttribute( 'fill', colour );
        }

        return root;
    },


    /**
     * Generates an identifier of a marker using type and coordinates.
     *
     * @param {LeafletModule.CircleMarker|LeafletModule.Marker} leafletMarker Marker to get the identifier of.
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
     * @param {LeafletModule.CircleMarker|LeafletModule.Marker} leafletMarker Marker to get the identifier of.
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
     * @param {Object<string, string|number|null>} paramsToSet
     * @param {boolean} [withHost]
     * @return {string}
     */
    makeUrlWithParams( map, paramsToSet, withHost ) {
        // eslint-disable-next-line compat/compat
        const params = new URLSearchParams( window.location.search );
        for ( const paramName in paramsToSet ) {
            if ( paramsToSet[ paramName ] ) {
                params.set( paramName, `${paramsToSet[ paramName ]}` );
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
     * @param {Object<string, string|number|null>} paramsToSet
     */
    updateLocation( map, paramsToSet ) {
        history.replaceState( {}, '', module.exports.makeUrlWithParams( map, paramsToSet, false ) );
    },


    TabberNeue: {
        /**
         * @param {jQuery} $element
         * @return {jQuery?}
         */
        getOwningPanel( $element ) {
            // TODO: use native functions
            const $panel = $element.closest( 'article.tabber__panel' );
            return $panel && $panel.length > 0 ? $panel : null;
        },


        /**
         * @param {jQuery} $element
         * @return {jQuery?}
         */
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
            return $panel ? ( $panel.attr( 'id' ) || $panel.attr( 'data-title' ).replace( ' ', '_' ) ) : null;
        }
    }
};
