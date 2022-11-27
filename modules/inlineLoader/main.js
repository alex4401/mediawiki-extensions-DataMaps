mw.dataMaps.registerMapAddedHandler( map => map.waitForLeaflet( () => {
    const dataNode = document.querySelector( `script#datamap-inline-data-${map.id}[type="application/datamap+json"]` );
    if ( dataNode ) {
        const data = JSON.parse( dataNode.innerText );
        map.streaming.instantiateMarkers( data );
    }
} ) );
