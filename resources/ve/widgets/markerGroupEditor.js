const Enums = mw.dataMaps.Enums,
    Util = mw.dataMaps.Util;


module.exports = class MarkerGroupEditor {
    constructor( ve, coreWidget ) {
        this.ve = ve;
        this.coreWidget = coreWidget;
        this.group = this.ve.map.config.groups[this.coreWidget.groupId];

        this.nameEd = new OO.ui.TextInputWidget( {
            value: this.group.name,
            spellcheck: true
        } );
        this.button = new OO.ui.PopupButtonWidget( { 
            icon: 'menu',
            popup: {
                $content: this._buildPopup(),
                padded: true,
                align: 'forwards'
            }
        } );

        this.nameEd.on( 'input', this.updateName );

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
            value: Util.getGroupCollectibleType( this.group ),
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
                    align: 'top'
                } ),
                new OO.ui.FieldLayout( this.collectibleModeEd, { 
                    label: mw.msg( 'datamap-ve-group-collectible-mode' ),
                    align: 'top'
                } )
            ]
        } );

        this.collectibleModeEd.on( 'change', this.updateCollectibleMode, this );
        this.articleLinkEd.on( 'input', this.updateArticleLink, this );

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
}
