const MapVisualEditor = require( './editor.js' );

mw.dataMaps.registerMapAddedHandler( map => {
    if ( map.isFeatureBitSet( mw.dataMaps.Enums.MapFlags.VisualEditor ) ) {
        map.ve = new MapVisualEditor( map );
    }
} );
