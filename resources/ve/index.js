module.exports = class MapVisualEditor extends mw.dataMaps.EventEmitter {
    constructor( map ) {
        super();
        
        this.map = map;
        this.toolFactory = new OO.ui.ToolFactory();
        this.groupFactory = new OO.ui.ToolGroupFactory();
        this.toolbar = new OO.ui.Toolbar( this.toolFactory, this.groupFactory, {
            actions: true
        } );

        // Push a CSS class onto the map container
        this.map.$root.addClass( 'datamap-is-ve-active' );

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
    }

    onClose() {
        this.toolbar.$element.remove();
        this.map.$root.removeClass( 'datamap-is-ve-active' );
    }
}