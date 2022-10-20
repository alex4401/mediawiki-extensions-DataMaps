const EventEmitter = mw.dataMaps.EventEmitter,
    Util = mw.dataMaps.Util,
    Enums = mw.dataMaps.Enums;


module.exports = class MapVisualEditor extends EventEmitter {
    constructor( map ) {
        super();
        
        this.map = map;

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

        // Set up the toolbar
        this.toolbar.setup( [
            {
                type: 'bar',
                include: []
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

        this.map.waitForLegend( () => this.map.waitForLeaflet( () => this.map.$status.hide() ) );
    }

    onClose() {
        this.toolbar.$element.remove();
        this.map.$root.removeClass( 'datamap-is-ve-active' );
    }

    _enhanceGroups() {
        for ( const groupToggle of Object.values( this.map.markerLegend.groupToggles ) ) {
            const group = this.map.config.groups[groupToggle.groupId];

            const textInput = new OO.ui.TextInputWidget( {
                value: group.name,
                flags: [ 'progressive' ],
                spellcheck: true
            } );
            groupToggle.field.$label.replaceWith( textInput.$element );

            const button = new OO.ui.PopupButtonWidget( { 
                icon: 'menu',
                popup: {
                    $content: this._buildGroupModifierPopup( groupToggle, group ),
                    padded: true,
                    align: 'forwards'
                }
            } );
            button.$element.appendTo( groupToggle.field.$header );
        }
    }

    _buildGroupModifierPopup( groupToggle, group ) {
        const collectibleMode = new OO.ui.RadioSelectInputWidget( {
            value: ( () => {
                switch ( Util.getGroupCollectibleType( group ) ) {
                    case Enums.MarkerGroupFlags.Collectible_Individual:
                        return 'individual';
                    case Enums.MarkerGroupFlags.Collectible_Group:
                        return 'group';
                    case Enums.MarkerGroupFlags.Collectible_GlobalGroup:
                        return 'globalGroup';
                }
                return null;
            } )(),
            options: [
                { data: null, label: 'None' },
                { data: 'individual', label: 'Individual' },
                { data: 'group', label: 'As group' },
                { data: 'globalGroup', label: 'As group (global)' }
            ]
        } );
        const articleLink = new OO.ui.TextInputWidget( {
            value: group.article
        } );

        const panel = new OO.ui.PanelLayout( {
            framed: false,
            expanded: false,
            padded: false,
            content: [
                new OO.ui.FieldLayout( articleLink, { 
                    label: mw.msg( 'datamap-ve-group-article-link' ),
                    align: 'top'
                } ),
                new OO.ui.FieldLayout( collectibleMode, { 
                    label: mw.msg( 'datamap-ve-group-collectible-mode' ),
                    align: 'top'
                } )
            ]
        } );
        

        return panel.$element;
    }
}