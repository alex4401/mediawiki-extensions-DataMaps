const MarkerPopup = mw.dataMaps.MarkerPopup,
    EditMarkerDialog = require( './dialogs/editMarker.js' );


module.exports = class EditableMarkerPopup extends MarkerPopup {
    shouldKeepAround() {
        return false;
    }


    build() {
        this.$status = $( '<label class="datamap-ve-popup-state">' ).text( mw.msg( 'datamap-ve-state-preview' ) )
            .appendTo( this.$content );

        this.$subTitle = $( '<b class="datamap-popup-subtitle">' ).text( this.markerGroup.name ).hide();
        this.label = new OO.ui.TextInputWidget( {
            classes: [ 'datamap-popup-title' ],
            type: 'text',
            value: this.slots.label,
            placeholder: this.markerGroup.name
        } );
        this.description = new OO.ui.MultilineTextInputWidget( {
            classes: [ 'datamap-popup-description' ],
            value: this.slots.desc,
            placeholder: mw.msg( 'datamap-ve-description-placeholder' ),
            maxLength: 300,
            spellcheck: true
        } );

        this.label.on( 'change', this._onPropertyChange, null, this );
        this.description.on( 'change', this._onPropertyChange, null, this );
        
        this.$content
            .append( this.$subTitle )
            .append( this.label.$element )
            .append( this.description.$element );
    }

    
    buildTools() {
        this.articleLinkTarget = new mw.widgets.TitleInputWidget( {
            namespace: 0,
            value: this.slots.article || this.markerGroup.article
        } );
        this.articleLinkText = new OO.ui.TextInputWidget( {
            type: 'text',
            placeholder: mw.msg( 'datamap-popup-related-article' )
        } );
        this.$seeMore = this.addTool( 'datamap-popup-seemore', new OO.ui.PopupButtonWidget( {
            label: mw.msg( 'datamap-popup-related-article' ),
            flags: [ 'progressive' ],
            framed: false,
            popup: {
                $content: $( '<div>' )
                    .append( new OO.ui.FieldLayout( this.articleLinkTarget, {
                        label: mw.msg( 'datamap-ve-popup-related-article-link' ),
                        align: 'left'
                    } ).$element )
                    .append( new OO.ui.FieldLayout( this.articleLinkText, {
                        label: mw.msg( 'datamap-ve-popup-related-article-text' ),
                        align: 'left'
                    } ).$element ),
                padded: true
            }
        } ).$element );

        /*if ( article ) {
            let msg = mw.msg( 'datamap-popup-related-article' );
            if ( article.indexOf( '|' ) >= 0 ) {
                const split = article.split( '|', 2 );
                msg = split[ 1 ];
                article = split[ 0 ];
            }

        }*/

        return this.$tools;
    }


    _onPropertyChange() {

    }
};
