const MODULE = 'ext.datamaps.vec';
$( '#ca-edit' ).on( 'click', event => {
    event.preventDefault();
    mw.loader.using( MODULE, () => {
        require( MODULE )();
    } );
} );