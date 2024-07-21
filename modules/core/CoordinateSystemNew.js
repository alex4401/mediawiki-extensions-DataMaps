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
};
