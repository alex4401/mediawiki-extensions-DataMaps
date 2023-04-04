const MapVisualEditor = require( './editor.js' ),
    { MapFlags } = require( 'ext.datamaps.core' );

mw.dataMaps.onMapInitialised( map => {
    if ( map.isFeatureBitSet( MapFlags.VisualEditor ) ) {
        map.on( 'legendManager', () => ( map.ve = new MapVisualEditor( map ) ) );
    }
}, null, mw.dataMaps.IS_COMPATIBLE_WITH_VISUAL_EDITOR );
