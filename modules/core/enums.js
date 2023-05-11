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
        /** @deprecated since v0.16.0 to be removed in v1.0.0. Use {@link IconRenderer_Canvas}. */
        RenderMarkersOntoCanvas: 1 << 8,
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
        PopupTooltips: 1 << 11
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
        Collectible_Any: ( 1 << 3 ) | ( 1 << 4 ) | ( 1 << 5 )
    }
};
