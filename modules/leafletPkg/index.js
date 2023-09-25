module.exports = Object.assign( {}, require( '../vendor/leaflet/leaflet.js' ), {
    Ark: {
        Popup: require( './Popup.js' ),
        PinIcon: require( './PinIcon.js' ),
        /**
         * @since 0.16.3
         */
        KeybindInteractionControl: require( './KeybindInteraction.js' ),
        /**
         * @deprecated since v0.16.3, will be removed in v1.0.0. Use {@link KeybindInteractionControl}.
         */
        InteractionControl: require( './KeybindInteraction.js' ),
        /**
         * @since 0.16.3
         */
        SleepInteractionControl: require( './SleepInteraction.js' )
    }
} );
