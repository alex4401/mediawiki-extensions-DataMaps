const { DialogController } = require( './workflow/base.js' );


/**
 * @extends {DialogController< 'close', {} >}
 */
module.exports = class ExperimentalNoticeDialog extends DialogController {
    /**
     * @return {OO.ui.Window.Size}
     */
    static getSize() {
        return 'large';
    }


    /**
     * @protected
     * @return {OO.ui.ActionWidget.ConfigOptions[]}
     */
    static getActions() {
        return [
            {
                action: 'close',
                label: mw.msg( 'datamap-ve-experimental-close' ),
                flags: [ 'primary', 'close', 'progressive' ],
                modes: [ 'first' ]
            }
        ];
    }


    build() {
        new OO.ui.PanelLayout( {
            expanded: false,
            padded: true,

            content: [
                new OO.ui.HtmlSnippet( this.msg( 'content' ) )
            ]
        } ).$element.appendTo( this.contentElement );
    }


    /**
     * @param {'close'} action
     * @return {OO.ui.Process?}
     */
    getActionProcess( action ) {
        if ( action === 'close' ) {
            return new OO.ui.Process( () => {
                this.dialog.close();
            } );
        }

        return null;
    }
};
