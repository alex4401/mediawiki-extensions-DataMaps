mw.subscribeDataMapsHook( 'afterInitialisation', ( map ) => map.waitForLeaflet( () => {
    const dataNode = document.querySelector( `script#datamap-inline-data-${map.id}[type="application/json+datamap"]` );
    if ( dataNode ) {
        const data = JSON.parse( dataNode.innerText );
        map.instantiateMarkers( data );
    }
} ) );