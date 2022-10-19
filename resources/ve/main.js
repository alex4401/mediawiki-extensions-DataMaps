const MapVisualEditor = require( './editor.js' );

mw.dataMaps.registerMapAddedHandler( map => {
    // TODO: should require a flag to be set on the map instance to be edited
    map.ve = new MapVisualEditor( map );
} );