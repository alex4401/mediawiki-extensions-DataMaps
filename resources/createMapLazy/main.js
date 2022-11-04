const MODULE = 'ext.datamaps.createMap';
$( '#ca-edit' ).on( 'click', event => {
    event.preventDefault();
    mw.loader.using( MODULE, () => {
        require( MODULE )();
    } );
} );