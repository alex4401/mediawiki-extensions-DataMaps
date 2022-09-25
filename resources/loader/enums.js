module.exports = {
    CRSOrigin: {
        TopLeft: 1,
        BottomLeft: 2
    },

    CollectibleType: {
        // Corresponds to CM_ constants in Data\MarkerGroupSpec
        Individual: 1,
        Global: 2,
        GlobalGroup: 3
    },

    MarkerGroupFlags: {
        IsNumberedInChecklists: 1<<0,
        CannotBeSearched: 1<<1
    }
};