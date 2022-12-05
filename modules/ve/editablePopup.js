const MarkerPopup = mw.dataMaps.MarkerPopup,
    EditMarkerDialog = require( './dialogs/editMarker.js' );


module.exports = class EditableMarkerPopup extends MarkerPopup {
    build() {
        $( '<p>' ).text( mw.msg( 'datamap-ve-waiting-for-parse' ) ).appendTo( this.$content );
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
};
