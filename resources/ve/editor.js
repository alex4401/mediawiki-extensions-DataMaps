module.exports = class MapVisualEditor extends mw.dataMaps.EventEmitter {
    constructor( map ) {
        super();
        
        this.map = map;

        this.map.storage.isWritable = false;
        this.map.storage.dismissed = [];

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

        // Set up the toolbar
        this.toolbar.setup( [
            {
                type: 'bar',
                include: []
            },
            {
                type: 'bar',
                include: [ 'commit' ]
            }
        ] );
        this.toolbar.$element.prependTo( this.map.$root.find( '.datamap-holder' ).parent() );
        this.toolbar.initialize();
        this.toolbar.emit( 'updateState', {
            ve: this
        } );

        this.map.on( 'legendLoaded', this._enhanceGroups, this );

        this.map.waitForLegend( () => this.map.waitForLeaflet( () => this.map.$status.hide() ) );
    }

    onClose() {
        this.toolbar.$element.remove();
        this.map.$root.removeClass( 'datamap-is-ve-active' );
    }

    _enhanceGroups() {
        for ( const groupToggle of this.map.markerLegend.groupToggles ) {
            const button = new OO.ui.PopupButtonWidget( { 
                icon: 'menu',
                popup: {
                    $content: $( '<p>test</p>' ),
                    padded: true,
                    align: 'forwards'
                }
            } );
            button.$element.appendTo( groupToggle.field.$header );
        }
    }
}