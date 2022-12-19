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
            namespace: 0
        } );
        this.articleLinkText = new OO.ui.TextInputWidget( {
            type: 'text',
            placeholder: mw.msg( 'datamap-popup-related-article' )
        } );

        if ( this.slots.article ) {
            if ( this.slots.article.indexOf( '|' ) >= 0 ) {
                const split = this.slots.article.split( '|', 2 );
                this.articleLinkTarget.setValue( split[ 0 ] );
                this.articleLinkText.setValue( split[ 1 ] );
            } else {
                this.articleLinkTarget.setValue( this.slots.article );
            }
        } else if ( this.markerGroup.article ) {
            if ( this.markerGroup.article.indexOf( '|' ) >= 0 ) {
                const split = this.markerGroup.article.split( '|', 2 );
                this.articleLinkTarget.setPlaceholder( split[ 0 ] );
                this.articleLinkText.setPlaceholder( split[ 1 ] );
            } else {
                this.articleLinkTarget.setPlaceholder( this.markerGroup.article );
            }
        }
        
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

        return this.$tools;
    }


    _onPropertyChange() {
        this.slots.label = this.label.getValue();
        this.slots.desc = this.description.getValue();

        let articleValue = this.articleLinkTarget.getValue();
        if ( ( !articleValue || articleValue.length === 0 ) && this.slots.article !== undefined ) {
            delete this.slots.article;
        } else {
            if ( this.articleLinkText.getValue() ) {
                articleValue += `|${this.articleLinkText.getValue()}`;
            }

            this.slots.article = articleValue;
        }
    }
};
