module.exports = Object.assign( {}, require( '../vendor/leaflet/leaflet.js' ), {
    Ark: {
        Popup: require( './popup.js' ),
        PinIcon: require( './pinIcon.js' ),
        /**
         * @since 0.16.3
         */
        KeybindInteractionControl: require( './keybindInteraction.js' ),
        /**
         * @deprecated since v0.16.3, will be removed in v1.0.0. Use {@link KeybindInteractionControl}.
         */
        InteractionControl: require( './keybindInteraction.js' ),
        /**
         * @since 0.16.3
         */
        SleepInteractionControl: require( './sleepInteraction.js' )
    }
} );
