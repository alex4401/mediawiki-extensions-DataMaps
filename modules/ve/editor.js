/** @typedef {import( '../core/legend/tabber.js' )} LegendTabber */
/** @typedef {import( './tabs/base.js' )} VePanel */
/** @typedef {import( './workflow/base.js' ).VeWorkflow} VeWorkflow */
/** @typedef {import( '../../schemas/src/index' ).DataMap} Schema_DataMap */
const { DataMap, EventEmitter, Util } = require( 'ext.datamaps.core' ),
    ExperimentalNotice = require( './experimentalNotice.js' ),
    EditableMarkerPopup = require( './editablePopup.js' ),
    DataCapsule = require( './dataCapsule.js' ),
    ToolBarControl = require( './toolControl.js' ),
    { getOrDefault } = require( './util.js' ),
    MarkerDataService = require( './data/markerService.js' );


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
         * @private
         * @type {Schema_DataMap?}
         */
        this._mapData = null;
        /**
         * @deprecated before release
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

        this.map.on( 'modifyMarkerOptions', this._enableMarkerDrag, this );
        this.map.on( 'markerReady', this._setMarkerDragEvents, this );

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


    /**
     * @return {Schema_DataMap}
     */
    getData() {
        if ( this._mapData === null ) {
            throw new Error( 'Attempted to access map source data before it has been loaded.' );
        }
        return this._mapData;
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


    /**
     * @private
     * @type {DataMaps.EventHandling.MapListenerSignatures[ 'modifyMarkerOptions' ]}
     * @param {LeafletModule.AnyMarkerType} cls
     * @param {DataMaps.ApiMarkerInstance} instance
     * @param {LeafletModule.CanvasIconMarkerOptions|LeafletModule.MarkerOptions} options
     */
    _enableMarkerDrag( cls, instance, options ) {
        options.draggable = true;
    }


    /**
     * @private
     * @param {LeafletModule.AnyMarker} instance
     */
    _setMarkerDragEvents( instance ) {
        instance.on( 'dragend', () => {
            const svc = this.getService( MarkerDataService ),
                source = svc.getLeafletMarkerSource( instance ),
                translated = this.map.translateLeafletCoordinates( instance.getLatLng(), true );
            svc.setSourceCoordinates( source, translated[ 0 ], translated[ 1 ] );
            svc.syncRuntime( instance );
        } );
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
                this._mapData = JSON.parse( data.query.pages[ this.map.id ].revisions[ 0 ].slots.main[ '*' ] );
                this.dataCapsule.set( this._mapData );
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

        // Initialise marker popup's dialog class and override popup class on map
        EditableMarkerPopup.Dialog.registerStandalone( this, 'mve-edit-marker', 'datamap-ve-workflow-marker' );
        this.map.getPopupClass = MapVisualEditor._getPopupClass.bind( this.map );

        // Make local map storage read-only and remove all dismissals
        this.map.storage.isWritable = false;
        this.map.storage.data.dismissed = [];

        // Push a CSS class onto the map container
        this.map.rootElement.classList.add( 'ext-datamaps-with-ve' );

        // Instantiate the free-flowing toolbar control
        this.addService( this.map.addControl( DataMap.anchors._none, new ToolBarControl( this ) ) );

        // Instantiate all services
        for ( const Cls of MapVisualEditor.DATA_SERVICES ) {
            this.addService( new Cls( this ) );
        }
        for ( const Cls of MapVisualEditor.PANELS ) {
            this.addService( new Cls( this ) ).setVisible( true );
        }
        for ( const Cls of MapVisualEditor.WORKFLOWS ) {
            this.addService( new Cls( this ) );
        }

        // Display a notice dialog that this is an experimental component
        ExperimentalNotice.registerStandalone( this, 'mve-experimental', 'datamap-ve-experimental' );
        this.windowManager.openWindow( 'mve-experimental' );
    }


    _instantiateMarkers() {
        const dataService = this.getService( MarkerDataService ),
            data = dataService.getData();
        this.map.on( 'leafletLoaded', () => {
            for ( const ownership in data ) {
                for ( const id of ownership.split( ' ' ) ) {
                    this.map.layerManager.register( id );
                }

                for ( const raw of data[ ownership ] ) {
                    dataService.create( ownership.split( ' ' ), raw );
                }
            }
            this.map.fire( 'chunkStreamingDone' );
            this.fireMemorised( 'markers' );
        } );
    }
}


/**
 * @constant
 * @type {( new( editor: MapVisualEditor ) => any )[]}
 */
MapVisualEditor.DATA_SERVICES = [
    require( './data/settingsService.js' ),
    require( './data/backgroundService.js' ),
    MarkerDataService
];
/**
 * @constant
 * @type {( new( editor: MapVisualEditor ) => VePanel )[]}
 */
MapVisualEditor.PANELS = [
    require( './tabs/markerGroups.js' ),
    require( './tabs/markerCategories.js' ),
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
