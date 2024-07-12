/* eslint-disable camelcase */
module.exports = {
    // TODO: CRSOrigin does not comply with MW's JS conventions
    /**
     * @readonly
     */
    CRSOrigin: {
        TopLeft: 1,
        BottomLeft: 2
    },

    /**
     * @readonly
     * @since 0.17.0
     */
    CoordinateDisplayStyle: {
        LatLon: 0,
        Xy: 1,
        Yx: 2
    },

    /**
     * @readonly
     */
    MapFlags: {
        ShowCoordinates: 1 << 0,
        HideLegend: 1 << 1,
        DisableZoom: 1 << 2,
        Search: 1 << 3,
        SortChecklistsByAmount: 1 << 4,
        LinkedSearch: 1 << 5,
        VisualEditor: 1 << 6,
        IsPreview: 1 << 7,
        IconRenderer_Canvas: 1 << 8,
        /**
         * @since 0.16.0
         */
        AllowFullscreen: 1 << 9,
        /**
         * @since 0.16.3
         */
        SleepingInteractions: 1 << 10,
        /**
         * @since 0.16.3
         */
        PopupTooltips: 1 << 11,
        /**
         * @since 0.17.4
         */
        CollapseLegend: 1 << 12
    },

    /**
     * @readonly
     * @since 0.17.5
     */
    PresentationFlags: {
        /**
         * @since 0.17.5
         */
        CentreOverFocusedMarker: 1 << 30
    },

    /**
     * @readonly
     */
    MarkerGroupFlags: {
        IsNumberedInChecklists: 1 << 0,
        CannotBeSearched: 1 << 1,
        IsUnselected: 1 << 2,
        Collectible_Individual: 1 << 3,
        Collectible_Group: 1 << 4,
        Collectible_GlobalGroup: 1 << 5,
        Collectible_Any: ( 1 << 3 ) | ( 1 << 4 ) | ( 1 << 5 ),
        /**
         * @since 0.17.4
         */
        IsUnswitchable: 1 << 6,
        /**
         * @since 0.17.8
         */
        Circle_IsStatic: 1 << 7
    }
};
