const
    {
        MapFlags,
        DataMap,
        Util
    } = require( 'ext.datamaps.core' ),
    MarkerSearch = require( './MarkerSearch.js' ),
    MarkerSearchIndex = require( './MarkerSearchIndex.js' );

/**
 * @type {Record<string, MarkerSearchIndex>}
 */
const sharedTabberIndexMap = {};
mw.dataMaps.registerMapAddedHandler( map => {
    if ( map.isFeatureBitSet( MapFlags.Search ) ) {
        map.on( 'leafletLoaded', () => {
            let isLinked = map.isFeatureBitSet( MapFlags.LinkedSearch ),
                tabberId = null;

            if ( isLinked ) {
                tabberId = Util.TabberNeue.getOwningId( map.rootElement );
                isLinked = tabberId !== null;
            }

            let index;
            if ( isLinked && tabberId !== null ) {
                const masterIndex = sharedTabberIndexMap[ tabberId ] = sharedTabberIndexMap[ tabberId ]
                    || new MarkerSearchIndex();
                index = new MarkerSearchIndex.ChildIndex( masterIndex );
            } else {
                index = new MarkerSearchIndex();
            }

            map.search = map.addControl( DataMap.anchors.legend, new MarkerSearch( map, index, isLinked ), true );
        } );
    }
} );
