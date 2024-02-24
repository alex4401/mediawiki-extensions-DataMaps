const
    {
        MapFlags,
        Controls,
        DataMap,
        Util
    } = require( 'ext.datamaps.core' ),
    SearchController = require( './SearchController.js' ),
    SearchIndex = require( './SearchIndex.js' );

/**
 * @type {[HTMLElement, SearchIndex][]}
 */
const linkedIndexMap = [];


/**
 * @param {InstanceType<DataMap>} map
 * @return {SearchIndex}
 */
function getOrCreateIndexFor( map ) {
    const isLinked = map.checkFeatureFlag( MapFlags.LinkedSearch );

    /** @type {HTMLElement?} */
    let tabberNode = null;
    if ( isLinked ) {
        tabberNode = Util.TabberNeue.getOwningTabber( map.rootElement );
    }

    if ( tabberNode ) {
        let masterIndex = ( linkedIndexMap.find( el => el[ 0 ] === tabberNode ) || [ null, null ] )[ 1 ];
        if ( !masterIndex ) {
            masterIndex = new SearchIndex();
            linkedIndexMap.push( [ tabberNode, masterIndex ] );
        }
        return new SearchIndex.ChildIndex( masterIndex );
    }

    return new SearchIndex();
}


/**
 * @param {InstanceType<typeof Controls.SearchHost>} control
 * @param {OO.ui.TextInputWidget} inputBox
 * @return {SearchController}
 */
module.exports.setupInHostControl = function ( control, inputBox ) {
    return new SearchController( control, inputBox, getOrCreateIndexFor( control.map ) );
};
