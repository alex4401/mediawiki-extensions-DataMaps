const MODULE = 'ext.datamaps.createMap';
mw.hook( 'wikipage.content' ).add( () => {
    document.getElementById( 'ca-edit' ).addEventListener( 'click', event => {
        event.preventDefault();
        mw.loader.using( MODULE, () => require( MODULE )() );
    } );
} );
