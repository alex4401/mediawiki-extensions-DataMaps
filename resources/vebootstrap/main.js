const VE_MODULE = 'ext.datamaps.ve';


// Retrieve the map instance. We're assuming this module is loaded in the Map namespace, therefore let's grab whatever
// instance we get from the bootstrap module (there should be only one).
let map = null;
mw.dataMaps.registerMapAddedHandler( instance => map = instance );
// Initialise a portlet link
let $portlet = $( mw.util.addPortletLink( 'p-cactions', '', mw.msg( 'datamap-ve-portlet' ), 't-mve-edit', null, null,
    '#ca-edit' ) );
let isLocked = false;
$portlet.on( 'click', event => {
    if ( !isLocked ) {
        isLocked = true;
        mw.loader.using( VE_MODULE, () => {
            map.ve = new ( require( VE_MODULE ) )( map );
            map.ve.on( 'close', () => {
                isLocked = false;
                map.ve = null;
            } );
        } );
    }

    event.preventDefault();
} );