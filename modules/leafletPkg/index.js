module.exports = Object.assign( {}, require( '../vendor/leaflet/leaflet.js' ), {
    Ark: {
        Popup: require( './popup.js' ),
        PinIcon: require( './pinIcon.js' ),
        InteractionControl: require( './interaction.js' )
    }
} );
