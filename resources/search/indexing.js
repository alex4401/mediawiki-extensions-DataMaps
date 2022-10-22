const Leaflet = require( 'ext.ark.datamaps.leaflet' ),
    Util = require( './util.js' );

module.exports = class MarkerSearchIndex extends mw.dataMaps.EventEmitter {
    constructor() {
        super();
        
        this.items = [];
        this._queue = [];
    }

    add( map, leafletMarker ) {
        const state = leafletMarker.apiInstance[2];
        const group = map.config.groups[leafletMarker.attachedLayers[0]];
        const label = state.label || group.name;

        if ( state.search == 0 || mw.dataMaps.Util.isBitSet( group.flags, mw.dataMaps.Enums.MarkerGroupFlags.CannotBeSearched ) ) {
            return;
        }

        // If no keywords were provided by the API, generate them from label and description
        if ( !state.search ) {
            state.search = [ [ Util.decodePartial( Util.extractText( label ) ), 1.5 ] ];
            if ( state.desc ) {
                state.search.push( [ state.desc, 0.75 ] );
            }
        }
        // If string was provided by the API, turn into a pair
        if ( typeof( state.search ) === 'string' ) {
            state.search = [ [ state.search, 1 ] ];
        }
        // Ensure search keywords are always an array of (text, weight) pairs
        state.search = state.search.map( x => ( typeof( x ) === 'string' ) ? [ x, 1 ] : x );

        this._queue.push( {
            icon: leafletMarker instanceof Leaflet.Ark.IconMarker
                ? map.getIconFromLayers( leafletMarker.attachedLayers ) : null,
            marker: leafletMarker,
            keywords: state.search,
            label,
            map
        } );
    }

    commit() {
        this.fire( 'commit', this._queue );
        this.items = this.items.concat( this._queue );
        this._queue = [];
    }
}