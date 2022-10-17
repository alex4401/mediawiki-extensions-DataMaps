module.exports = class MapVisualEditor extends mw.dataMaps.EventEmitter {
    constructor( map ) {
        super();
        
        this.map = map;
        this.toolFactory = new OO.ui.ToolFactory();
        this.groupFactory = new OO.ui.ToolGroupFactory();
        this.toolbar = new OO.ui.Toolbar( this.toolFactory, this.groupFactory, {
            actions: true
        } );

        this.toolbar.$element.prependTo( this.map.$root.find( '.datamap-holder' ).parent() );

        // Set up internal event handlers
        this.on( 'close', this.onClose, this );
    }

    onClose() {
        this.toolbar.$element.remove();
    }
}