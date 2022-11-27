const Util = require( './util.js' ),
    Fuzzysort = require( 'ext.datamaps.fuzzysort' );


/**
 * A search index entry collection.
 */
class MarkerSearchIndex extends mw.dataMaps.EventEmitter {
    constructor() {
        super();

        this.items = [];
        this._queue = [];
    }


    _transform( map, leafletMarker ) {
        const state = leafletMarker.apiInstance[ 2 ];
        const group = map.config.groups[ leafletMarker.attachedLayers[ 0 ] ];
        const label = state.label || group.name;

        let keywords = state.search;

        // If no keywords were provided by the API, generate them from label and description
        if ( !keywords ) {
            keywords = [ [ Util.decodePartial( Util.extractText( label ) ), 1.5 ] ];
            if ( state.desc ) {
                keywords.push( [ state.desc, 0.75 ] );
            }
        }
        // If string was provided by the API, turn into a pair
        if ( typeof keywords === 'string' ) {
            keywords = [ [ keywords, 1 ] ];
        }
        // Ensure search keywords are always an array of (text, weight) pairs
        keywords = keywords.map( x => ( typeof x === 'string' ) ? [ x, 1 ] : x );
        // Run normaliser and Fuzzysort preparator on each keyword
        keywords = keywords.map( x => [ Fuzzysort.prepare( MarkerSearchIndex.normalisePhrase( x[ 0 ] ) ), x[ 1 ] ] );

        return {
            leafletMarker,
            keywords,
            label,
            map
        };
    }


    _enqueue( info ) {
        this._queue.push( info );
    }


    add( map, leafletMarker ) {
        if ( leafletMarker.apiInstance[ 2 ].search === 0
            || mw.dataMaps.Util.isBitSet( map.config.groups[ leafletMarker.attachedLayers[ 0 ] ].flags,
                mw.dataMaps.Enums.MarkerGroupFlags.CannotBeSearched ) ) {
            return;
        }

        this._enqueue( this._transform( map, leafletMarker ) );
    }


    commit() {
        this.fire( 'commit', this._queue );
        this.items = this.items.concat( this._queue );
        this._queue = [];
    }


    query( phrase ) {
        return Fuzzysort.go( MarkerSearchIndex.normalisePhrase( phrase ), this.items, {
            threshold: -75000,
            weighedKey: 'keywords'
        } );
    }
}


MarkerSearchIndex.normalisePhrase = function ( text ) {
    // Replace trailing whitespace, normalize multiple spaces and make case insensitive
    return text.trim().replace( /\s+/, ' ' ).toLowerCase().normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' );
};


/**
 * A search index entry collection that replicates information into a shared index.
 */
MarkerSearchIndex.ChildIndex = class ChildIndex extends MarkerSearchIndex {
    constructor( parent ) {
        super();
        this.parent = parent;
    }


    _enqueue( info ) {
        this._queue.push( info );
        // Propagate the entry to the master index: copy it, push tabber title to its keywords, enqueue.
        // eslint-disable-next-line compat/compat
        const copy = Object.assign( {}, info );
        // eslint-disable-next-line compat/compat
        copy.keywords = Array.from( info.keywords );
        copy.keywords.push( [ Util.TabberNeue.getOwningPanel( info.map.$root ).attr( 'title' ), 0.2 ] );
        // eslint-disable-next-line no-underscore-dangle
        this.parent._enqueue( copy );
    }


    commit() {
        super.commit();
        // Propagate the commit operation to the master index
        this.parent.commit();
    }
};


module.exports = MarkerSearchIndex;
