const Enums = mw.dataMaps.Enums,
    Util = mw.dataMaps.Util,
    ConfirmDeleteDialog = require( '../dialogs/confirmDelete.js' );


module.exports = class MarkerGroupEditor {
    constructor( ve, coreWidget ) {
        this.ve = ve;
        this.coreWidget = coreWidget;
        this.group = this.ve.map.config.groups[ this.coreWidget.groupId ];

        this.nameEd = new OO.ui.TextInputWidget( {
            value: this.group.name,
            spellcheck: true
        } );
        this.button = new OO.ui.PopupButtonWidget( {
            icon: 'menu',
            popup: {
                $content: this._buildPopup(),
                classes: [ 'datamap-ve-popup' ],
                head: true,
                invisibleLabel: true,
                padded: true,
                align: 'forwards'
            }
        } );

        this.nameEd.on( 'change', this.updateName, null, this );

        this.coreWidget.field.$label.replaceWith( this.nameEd.$element );
        this.button.$element.appendTo( this.coreWidget.field.$header );
    }


    _buildPopup() {
        this.idEd = new OO.ui.TextInputWidget( {
            value: this.coreWidget.groupId,
            readOnly: true,
            disabled: true
        } );
        this.collectibleModeEd = new OO.ui.RadioSelectInputWidget( {
            value: Util.Groups.getCollectibleType( this.group ),
            options: [
                { data: null, label: 'None' },
                { data: Enums.MarkerGroupFlags.Collectible_Individual, label: 'Individual' },
                { data: Enums.MarkerGroupFlags.Collectible_Group, label: 'As group' },
                { data: Enums.MarkerGroupFlags.Collectible_GlobalGroup, label: 'As group (global)' }
            ]
        } );
        this.articleLinkEd = new OO.ui.TextInputWidget( {
            value: this.group.article
        } );
        this.deleteButton = new OO.ui.ButtonWidget( {
            label: mw.msg( 'datamap-ve-tool-delete' ),
            icon: 'trash',
            flags: [ 'primary', 'destructive' ]
        } );

        this.popupPanel = new OO.ui.PanelLayout( {
            framed: false,
            expanded: false,
            padded: false,
            content: [
                new OO.ui.FieldLayout( this.idEd, {
                    label: mw.msg( 'datamap-ve-group-id' ),
                    align: 'top',
                    help: mw.msg( 'datamap-ve-group-id-cannot-modify' ),
                    helpInline: true
                } ),
                new OO.ui.FieldLayout( this.articleLinkEd, {
                    label: mw.msg( 'datamap-ve-group-article-link' ),
                    align: 'top',
                    help: mw.msg( 'datamap-ve-group-article-link-subtext' ),
                    helpInline: true
                } ),
                new OO.ui.FieldLayout( this.collectibleModeEd, {
                    label: mw.msg( 'datamap-ve-group-collectible-mode' ),
                    align: 'top'
                } ),
                this.deleteButton
            ]
        } );

        this.collectibleModeEd.on( 'change', this.updateCollectibleMode, null, this );
        this.articleLinkEd.on( 'change', this.updateArticleLink, null, this );
        this.deleteButton.on( 'click', this.promptDeleteConfirmation, null, this );

        return this.popupPanel.$element;
    }


    updateName() {
        this.group.name = this.nameEd.getValue();
        this.ve.markStale( this.group );
    }


    updateCollectibleMode() {
        this.group.flags = ( this.group.flags & ~Enums.MarkerGroupFlags.Collectible_Any ) | this.collectibleModeEd.getData();
        this.ve.markStale( this.group );
    }


    updateArticleLink() {
        this.group.article = this.articleLinkEd.getValue();
        this.ve.markStale( this.group );
    }


    promptDeleteConfirmation() {
        const dialog = new ConfirmDeleteDialog( {
            size: 'small',
            message: mw.msg( 'datamap-ve-group-confirm-delete', this.coreWidget.groupId ),
            callback: () => this.ve.destroyMarkerGroup( this.coreWidget.groupId )
        } );
        this.ve.windowManager.addWindows( [ dialog ] );
        this.ve.windowManager.openWindow( dialog );
    }
};
