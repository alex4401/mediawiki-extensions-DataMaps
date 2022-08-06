mw.subscribeDataMapsHook( 'afterInitialisation', ( map ) => map.waitForLeaflet( () => {
    const dataNode = document.querySelector( `script#datamap-edit-preview-${map.id}[type="application/json+datamap"]` );
    if ( dataNode ) {
        const data = JSON.parse( dataNode.innerText );
        map.instantiateMarkers( data.markers );
        map.$status.hide();
    }
} ) );