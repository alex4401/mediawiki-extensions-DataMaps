module.exports = require( '../vendor/leaflet/leaflet.js' );
module.exports.Ark = {
    /** @deprecated */
    CircleMarker: require( './circleMarker.js' ),
    /** @deprecated */
    IconMarker: require( './iconMarker.js' ),

    Popup: require( './popup.js' )
};
