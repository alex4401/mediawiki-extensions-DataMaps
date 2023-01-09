/* eslint-disable camelcase */
module.exports = {
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
        RenderMarkersOntoCanvas: 1 << 8
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
