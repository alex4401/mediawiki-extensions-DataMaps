const
    CoordinateSystem = require( './CoordinateSystem.js' ),
    { CoordinateDisplayStyle, CRSOrigin } = require( './enums.js' ),
    { getLeaflet } = require( './Util.js' );


module.exports = class CoordinateSystemNew extends CoordinateSystem {
    constructor ( origin, order, angle ) {
        super( [ [ 0, 0 ], [ 1, 1 ] ], order, angle );
        this.origin = origin;
        this.scaleX = 0.01;
        this.scaleY = 0.01;
    }


    /**
     * Maps a point from map's coordinate reference system specified by the server, to the universal space [ 0 0 100 100 ].
     * This respects CRS rotation.
     *
     * This is non-destructive, and clones the input.
     *
     * @param {DataMaps.PointTupleRepr} point Array with two number elements: X and Y coordinates.
     * @return {LeafletModule.PointTuple} New point in the universal space.
     */
    fromPoint( point ) {
        const
            y = point[ 0 ] * this.scaleY,
            x = point[ 1 ] * this.scaleX;
        return [ x * this.rSin + y * this.rCos, x * this.rCos - y * this.rSin ];
    }


    /**
     * Maps a box from map's coordinate reference system specified by the server, to the universal space [ 0 0 100 100 ].
     * This does not respect CRS rotation. Consumers must handle it on their own.
     *
     * This is non-destructive, and clones the input.
     *
     * @param {LeafletModule.LatLngBoundsTuple} box
     * @return {LeafletModule.LatLngBoundsTuple} New box in the universal space.
     */
    fromBox( box ) {
        const
            sY = box[ 0 ][ 0 ] * this.scaleY,
            sX = box[ 0 ][ 1 ] * this.scaleX,
            eY = box[ 1 ][ 0 ] * this.scaleY,
            eX = box[ 1 ][ 1 ] * this.scaleX;
        return [
            [ sY, sX ],
            [ eY, eX ]
        ];
    }


    /**
     * @param {LeafletModule.LatLng} latlng
     * @param {boolean} [round=false]
     * @return {DataMaps.PointTupleRepr}
     */
    fromLeaflet( latlng, round ) {
        let lat = latlng.lat / this.scaleY,
            lon = latlng.lng / this.scaleX;

        if ( this.rotation ) {
            [ lat, lon ] = [
                lon * this.rSinInv + lat * this.rCosInv,
                lon * this.rCosInv - lat * this.rSinInv
            ];
        }

        if ( round ) {
            lat = Math.round( lat * 10e3 ) / 10e3;
            lon = Math.round( lon * 10e3 ) / 10e3;
        }

        return [ lat, lon ];
    }
};
