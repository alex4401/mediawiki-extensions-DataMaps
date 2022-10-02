module.exports = require( '../vendor/leaflet/leaflet.js' );
module.exports.Ark = {
    CircleMarker: require( './circleMarker.js' ),
    IconMarker: require( './iconMarker.js' ),
    Popup: require( './popup.js' )
};


/* DEPRECATED(v0.13.0:v0.14.0): use mw.loader.require( '' ) */
window.L = module.exports;