/** @typedef {import( '../core/map.js' )} DataMap */
const Util = require( './util.js' ),
    {
        EventEmitter,
        MarkerGroupFlags,
        Util: CoreUtil
    } = require( 'ext.datamaps.core' ),
    Fuzzysort = require( 'ext.datamaps.fuzzysort' );


/**
 * @typedef {Object} Item
 * @property {LeafletModule.AnyMarker} leafletMarker
 * // TODO: missing Fuzzysort prepared type
 * @property {[ {
 *     target: any;
 *     i: any;
 *     u: any[];
 *     h: null;
 *     p: number;
 *     score: null;
 *     S: number[];
 *     obj: null;
 * }, number ][]} keywords
 * @property {string} label
 * @property {DataMap} map
 */
/**
 * @typedef {Object} ListenerSignatures
 * @property {( items: Item[] ) => void} precommit
 * @property {() => void} commit
 */
/**
 * @typedef {Object} Item
 * @property {LeafletModule.AnyMarker} leafletMarker
 * @property {DataMaps.SearchKeywordWeighing[]} keywords
 * @property {string} label
 * @property {DataMap} map
 */


/**
 * A search index entry collection.
 *
 * @extends EventEmitter<ListenerSignatures>
 */
class MarkerSearchIndex extends EventEmitter {
    constructor() {
        super();

        /**
         * @type {Item[]}
         */
        this.items = [];
        /**
         * @protected
         * @type {Item[]}
         */
        this._queue = [];
    }


    /**
     * @param {string} value String to normalise.
     * @return {string}
     */
    static normalisePhrase( value ) {
        // Replace trailing whitespace, normalize multiple spaces and make case insensitive
        return value.trim().replace( /\s+/, ' ' ).toLowerCase().normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' );
    }


    /**
     * TODO: fuzzysort output is untyped
     *
     * @param {Item[]} items
     * @param {string} phrase
     * @return {any[]}
     */
    static query( items, phrase ) {
        return Fuzzysort.go( MarkerSearchIndex.normalisePhrase( phrase ), items, {
            threshold: MarkerSearchIndex.SCORE_THRESHOLD,
            weighedKey: 'keywords'
        } );
    }


    /**
     * @param {DataMap} map
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @return {Item}
     */
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


    /**
     * @package
     * @param {Item} info
     */
    _enqueue( info ) {
        this._queue.push( info );
    }


    /**
     * @param {DataMap} map
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    add( map, leafletMarker ) {
        if ( leafletMarker.apiInstance[ 2 ].search === 0
            || CoreUtil.isBitSet( map.config.groups[ leafletMarker.attachedLayers[ 0 ] ].flags,
                MarkerGroupFlags.CannotBeSearched ) ) {
            return;
        }

        this._enqueue( this._transform( map, leafletMarker ) );
    }


    commit() {
        this.fire( 'precommit', this._queue );
        this.items = this.items.concat( this._queue );
        this.items.sort( ( a, b ) => a.label.localeCompare( b.label ) );
        this._queue = [];
        this.fire( 'commit' );
    }


    /**
     * TODO: fuzzysort output is untyped
     *
     * @param {string} phrase
     * @return {any[]}
     */
    query( phrase ) {
        return MarkerSearchIndex.query( this.items, phrase );
    }
}


/**
 * @constant
 * @type {number}
 */
MarkerSearchIndex.SCORE_THRESHOLD = -75000;


/**
 * A search index entry collection that replicates information into a shared index.
 *
 * @extends {MarkerSearchIndex}
 */
class ChildIndex extends MarkerSearchIndex {
    /**
     * @param {MarkerSearchIndex} parent
     */
    constructor( parent ) {
        super();
        this.parent = parent;
    }


    /**
     * @package
     * @param {Item} info
     */
    _enqueue( info ) {
        this._queue.push( info );

        const tabber = CoreUtil.getNonNull( CoreUtil.TabberNeue.getOwningPanel( info.map.rootElement ) ),
            tabberTitle = CoreUtil.getNonNull( tabber.getAttribute( 'title' ) );
        // Propagate the entry to the master index: copy it, push tabber title to its keywords, enqueue.
        const copy = Object.assign( {}, info );
        copy.keywords = Array.from( info.keywords );
        copy.keywords.push( [ Fuzzysort.prepare( tabberTitle ), 0.2 ] );
        this.parent._enqueue( copy );
    }


    commit() {
        super.commit();
        // Propagate the commit operation to the master index
        this.parent.commit();
    }
}


MarkerSearchIndex.ChildIndex = ChildIndex;
module.exports = MarkerSearchIndex;
