/** @typedef {import( '../core/legend/tabber.js' )} LegendTabber */
/** @typedef {import( './tabs/base.js' )} VePanel */
/** @typedef {import( './workflow/base.js' ).VeWorkflow} VeWorkflow */
const { DataMap, EventEmitter, Util } = require( 'ext.datamaps.core' ),
    EditableMarkerPopup = require( './editablePopup.js' ),
    DataCapsule = require( './dataCapsule.js' ),
    ToolBarControl = require( './toolControl.js' );


/**
 * @extends {EventEmitter<DataMaps.EventHandling.VeListenerSignatures>}
 */
class MapVisualEditor extends EventEmitter {
    /**
     * @param {InstanceType<DataMap>} map Map to edit.
     */
    constructor( map ) {
        super();

        /**
         * @type {InstanceType<DataMap>}
         */
        this.map = map;
        /**
         * @type {LegendTabber?}
         */
        this.legendTabber = Util.getNonNull( map.legend );
        /**
         * @type {number}
         */
        this.revisionId = mw.config.get( 'wgCurRevisionId' );
        /**
         * @type {DataCapsule}
         */
        this.dataCapsule = new DataCapsule();
        /**
         * @type {OO.Factory}
         */
        this.windowFactory = new OO.Factory();
        /**
         * @type {OO.ui.WindowManager}
         */
        this.windowManager = new OO.ui.WindowManager( {
            factory: this.windowFactory
        } );
        this.windowManager.$element.appendTo( document.body );
        /**
         * @type {Record<string, any>}
         */
        this._svcs = {};

        this.on( 'ready', () => {
            Util.getNonNull( Util.getNonNull( map.rootElement.previousElementSibling ).previousElementSibling ).remove();
        } );
        this.on( 'sourceData', this._instantiateMarkers, this );
        this.on( 'sourceData', () => this.fireMemorised( 'ready' ) );

        this._setup();
        this._requestRevisionData();
    }


    /**
     * Returns the class to be used for marker popup contents.
     *
     * @private
     * @return {typeof EditableMarkerPopup}
     */
    static _getPopupClass() {
        return EditableMarkerPopup;
    }


    getPageName() {
        return mw.config.get( 'wgPageName' );
    }


    /**
     * @return {boolean}
     */
    doesRequireMarkerIds() {
        return DataCapsule.getField( this.dataCapsule.get(), 'settings', {} ).requireCustomMarkerIDs === true;
    }


    _requestRevisionData() {
        this.map.streaming.callApiReliable( {
            action: 'query',
            prop: 'revisions',
            titles: mw.config.get( 'wgPageName' ),
            rvstartid: this.revisionId,
            rvlimit: 1,
            rvprop: 'content',
            rvslots: 'main'
        } )
            .then( data => {
                this.dataCapsule.set( JSON.parse( data.query.pages[ this.map.id ].revisions[ 0 ].slots.main[ '*' ] ) );
                this.fireMemorised( 'sourceData' );
            } )
            .catch( ex => {
                this.map.setStatusOverlay( 'error', mw.msg( 'datamap-error-dataload' ) );
                throw ex;
            } );
    }


    _setup() {
        // Turn off the built-in filters panel
        Util.getNonNull( this.map.filtersPanel ).setVisible( false );

        // Override marker popup class
        this.map.getPopupClass = MapVisualEditor._getPopupClass.bind( this.map );

        // Make local map storage read-only and remove all dismissals
        this.map.storage.isWritable = false;
        this.map.storage.data.dismissed = [];

        // Insert a notice that the visual editor is in beta
        ( new OO.ui.MessageWidget( {
            type: 'notice',
            label: new OO.ui.HtmlSnippet( mw.msg( 'datamap-ve-beta-notice' ) )
        } ) ).$element.prependTo( Util.getNonNull( this.map.rootElement ) );

        // Insert a notice that some features (like collectibles) are not available in the visual editor
        ( new OO.ui.MessageWidget( {
            type: 'warning',
            label: mw.msg( 'datamap-ve-limited-preview-notice' ),
            showClose: true
        } ) ).$element.prependTo( Util.getNonNull( this.map.rootElement.querySelector( '.ext-datamaps-container-top' ) ) );

        // Push a CSS class onto the map container
        this.map.rootElement.classList.add( 'ext-datamaps-with-ve' );

        // Instantiate the free-flowing toolbar control
        this.addService( this.map.addControl( DataMap.anchors._none, new ToolBarControl( this ) ) );

        // Instantiate all panels and workflows
        for ( const Cls of MapVisualEditor.PANELS ) {
            this.addService( new Cls( this ) ).setVisible( true );
        }
        for ( const Cls of MapVisualEditor.WORKFLOWS ) {
            this.addService( new Cls( this ) );
        }
    }


    _instantiateMarkers() {
        const data = DataCapsule.getField( this.dataCapsule.get(), 'markers', {} ),
            /** @type {Record< string, DataMaps.ApiMarkerInstance[] >} */ store = {};
        for ( const ownership in data ) {
            store[ ownership ] = [];
            for ( const raw of data[ ownership ] ) {
                store[ ownership ].push( [ raw.y || raw.lat, raw.x || raw.lon, {
                    editor: this,
                    raw,
                    article: raw.article
                } ] );
            }
        }

        this.map.on( 'leafletLoaded', () => {
            this.map.streaming.instantiateMarkers( store );
            this.map.fire( 'chunkStreamingDone' );
        } );
        this.fireMemorised( 'markers' );
    }


    /**
     * @template {Object} T
     * @param {T} obj
     * @return {T}
     */
    addService( obj ) {
        if ( !( 'constructor' in obj ) ) {
            throw new Error( 'Only class instances may be added as a MVE service when a key is not specified.' );
        }
        if ( obj.constructor.name in this._svcs ) {
            throw new Error( `Attempted to add service '${obj.constructor.name}', but the name has already been registered.` );
        }
        this._svcs[ obj.constructor.name ] = obj;
        return obj;
    }


    /**
     * @template T
     * @param {new( ...args: any[] ) => T} cls
     * @return {T}
     */
    getService( cls ) {
        return Util.getNonNull( /** @type {T?} */ ( this._svcs[ cls.name ] ) );
    }
}


/**
 * @constant
 * @type {( new( editor: MapVisualEditor ) => VePanel )[]}
 */
MapVisualEditor.PANELS = [
    require( './tabs/mapSettings.js' )
];
/**
 * @constant
 * @type {( new( editor: MapVisualEditor ) => VeWorkflow )[]}
 */
MapVisualEditor.WORKFLOWS = [
    require( './workflow/createMarker.js' ),
    require( './workflow/saveEdit.js' )
];


module.exports = MapVisualEditor;
