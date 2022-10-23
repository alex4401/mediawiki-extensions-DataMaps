const EventEmitter = mw.dataMaps.EventEmitter,
    Util = mw.dataMaps.Util,
    Enums = mw.dataMaps.Enums,
    MarkerGroupEditor = require( './widgets/markerGroupEditor.js' );


module.exports = class MapVisualEditor extends EventEmitter {
    constructor( map ) {
        super();
        
        this.map = map;
        this.revisionId = mw.config.get( 'wgCurRevisionId' );

        this.map.storage.isWritable = false;
        this.map.storage.dismissed = [];

        $( '<div class="datamap-ve-info-bar datamap-ve-beta-notice">' )
            .text( mw.msg( 'datamap-ve-beta-notice' ) )
            .prependTo( this.map.$root.find( '.datamap-container-top' ) );

        $( '<div class="datamap-ve-info-bar warning">' )
            .text( mw.msg( 'datamap-ve-limited-preview-notice' ) )
            .prependTo( this.map.$root.find( '.datamap-holder' ).parent() );

        this.windowManager = new OO.ui.WindowManager();
        $( 'body' ).append( this.windowManager.$element );

        this.toolFactory = new OO.ui.ToolFactory();
        this.groupFactory = new OO.ui.ToolGroupFactory();
        this.toolbar = new OO.ui.Toolbar( this.toolFactory, this.groupFactory, {
            actions: true
        } );

        // Push a CSS class onto the map container
        this.map.$root.addClass( 'datamap-is-ve-active' );

        this.map.$status.show().text( mw.msg( 'datamap-ve-loading' ) );

        // Set up internal event handlers
        this.on( 'close', this.onClose, this );
        
        // Register tools
        this.toolFactory.register( require( './tools/commit.js' ) );
        this.toolFactory.register( require( './tools/sourceEditor.js' ) );
        this.toolFactory.register( require( './tools/addMarker.js' ) );

        // Set up the toolbar
        this.toolbar.setup( [
            {
                type: 'bar',
                include: [ 'addMarker' ]
            },
            {
                type: 'bar',
                include: [ 'sourceEditor', 'commit' ]
            }
        ] );
        this.toolbar.$element.prependTo( this.map.$root.find( '.datamap-holder' ).parent() );
        this.toolbar.initialize();
        this.toolbar.emit( 'updateState', {
            ve: this
        } );

        this.map.on( 'legendLoaded', this._enhanceGroups, this );

        this.map.waitForLegend( () => this.map.waitForLeaflet( () => {
            map.streaming.loadSequential( null, this.revisionId )
                .then( () => map.$status.hide() )
                .catch( () => map.$status.show().html( mw.msg( 'datamap-error-dataload' ) ).addClass( 'error' ) );
        } ) );
    }

    onClose() {
        this.toolbar.$element.remove();
        this.map.$root.removeClass( 'datamap-is-ve-active' );
    }

    _enhanceGroups() {
        // Hide the mass-visibility toggle button group
        this.map.markerLegend.buttonGroup.toggle( false );
        // Rename the tab
        this.map.markerLegend.tab.tabItem.setLabel( mw.msg( 'datamap-ve-legend-tab-marker-groups' ) );

        // Rebuild every marker group toggle into editor widgets
        for ( const groupToggle of Object.values( this.map.markerLegend.groupToggles ) ) {
            groupToggle.veWidget = new MarkerGroupEditor( this, groupToggle );
        }
    }

    markStale( obj ) {
        obj._ve_stale = true;
    }
}