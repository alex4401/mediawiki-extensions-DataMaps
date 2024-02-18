module.exports = Object.assign( {}, require( '../vendor/leaflet/leaflet.js' ), {
    Ark: {
        Popup: require( './Popup.js' ),
        PinIcon: require( './PinIcon.js' ),
        /**
         * @since 0.16.3
         */
        KeybindInteractionControl: require( './KeybindInteraction.js' ),
        /**
         * @since 0.16.3
         */
        SleepInteractionControl: require( './SleepInteraction.js' )
    }
} );
