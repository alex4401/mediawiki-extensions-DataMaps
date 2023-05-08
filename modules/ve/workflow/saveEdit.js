/** @typedef {import( '../editor.js' )} MapVisualEditor */
/** @typedef {import( './base.js' ).WorkflowMountConfigPrivate} WorkflowMountConfigPrivate */
const { VeWorkflow, DialogController } = require( './base.js' ),
    { DataMap, Util } = require( 'ext.datamaps.core' );


class SaveEditWorkflow extends VeWorkflow {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( SaveEditWorkflow.Dialog, editor, {
            id: 'save-edit',
            msg: 'datamap-ve-workflow-save',
            icon: 'edit',
            button: 'primary',
            anchor: DataMap.anchors.topRightInline
        } );
    }
}


/**
 * @extends {DialogController< 'finalise', {} >}
 */
SaveEditWorkflow.Dialog = class SaveEditDialogController extends DialogController {
    /**
     * @protected
     * @return {OO.ui.ActionWidget.ConfigOptions[]}
     */
    static getActions() {
        return [
            {
                action: 'finalise',
                label: mw.msg( 'datamap-ve-workflow-save-submit' ),
                flags: [ 'primary', 'progressive' ],
                modes: [ 'first' ]
            },
            Object.assign( DialogController.CLOSE_ACTION, /** @type {OO.ui.ActionWidget.ConfigOptions} */ ( {
                modes: [ 'first' ]
            } ) )
        ];
    }


    build() {
        new OO.ui.PanelLayout( {
            expanded: false,
            padded: true,

            content: [
                Util.createDomElement( 'p', {
                    text: this.msg( 'summary' )
                } ),
                this.summaryInput = new OO.ui.MultilineTextInputWidget( {
                    placeholder: this.msg( 'summary-desc' ),
                    autosize: true,
                    spellcheck: true
                } ),
                Util.createDomElement( 'p', {
                    text: this.msg( 'licence' )
                } )
            ]
        } ).$element.appendTo( Util.getNonNull( this.contentElement ) );

        mw.widgets.visibleCodePointLimit( this.summaryInput, mw.config.get( 'wgCommentCodePointLimit' ) );
    }


    /**
     * @param {'finalise'} action
     * @return {OO.ui.Process?}
     */
    getActionProcess( action ) {
        if ( action === 'finalise' ) {
            return new OO.ui.Process( () => {
                return this._saveRevision();
            } )
                .next( () => {
                    location.href = mw.util.getUrl( this.editor.getPageName() );
                } );
        }

        return null;
    }


    /**
     * @protected
     * @return {JQuery.Promise<any, any, any>}
     */
    _saveRevision() {
        const data = this.editor.dataCapsule.get(),
            serialised = JSON.stringify( data );

        // TODO: implement formatting

        return new mw.Api().edit( this.editor.getPageName(), () => {
            return {
                text: serialised,
                summary: Util.getNonNull( this.summaryInput ).getValue(),
                isdatamapsve: true
            };
        } );
    }
};


module.exports = SaveEditWorkflow;
