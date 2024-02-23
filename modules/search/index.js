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
 * @type {Record<string, SearchIndex>}
 */
const linkedIndexMap = {};


/**
 * @param {InstanceType<DataMap>} map
 * @return {SearchIndex}
 */
function getOrCreateIndexFor( map ) {
    const isLinked = map.checkFeatureFlag( MapFlags.LinkedSearch );

    let tabberId = null;
    if ( isLinked ) {
        tabberId = Util.TabberNeue.getOwningId( map.rootElement );
    }

    if ( tabberId ) {
        const masterIndex = linkedIndexMap[ tabberId ] = linkedIndexMap[ tabberId ] || new SearchIndex();
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
