/** @typedef {import( '../editor.js' )} MapVisualEditor */
const { VeWorkflow, DialogController } = require( './base.js' ),
    { DataMap, Util } = require( 'ext.datamaps.core' );


class CreateMarkerWorkflow extends VeWorkflow {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( CreateMarkerWorkflow.Dialog, editor, {
            id: 'create-marker',
            msg: 'datamap-ve-workflow-newmarker',
            icon: 'mapPin',
            anchor: DataMap.anchors.veToolBar
        } );
    }
}


/**
 * @extends {DialogController< 'close' >}
 */
CreateMarkerWorkflow.BaseMarkerDialog = class BaseMarkerDialogController extends DialogController {

};


/**
 * @extends {DialogController< 'save' >}
 */
CreateMarkerWorkflow.Dialog = class CreateMarkerDialogController extends DialogController {
    /**
     * @protected
     * @return {OO.ui.ActionWidget.ConfigOptions[]}
     */
    static getActions() {
        return [
            {
                action: 'save',
                flags: [ 'primary', 'progressive' ],
                modes: [ 'entry' ]
            },
            DialogController.CLOSE_ACTION
        ];
    }


    build() {
        super.build();

        
    }


    /**
     * @param {'save'} action
     * @return {OO.ui.Process?}
     */
    getActionProcess( action ) {
        if ( action === 'save' ) {
            return new OO.ui.Process( () => {
                return;// promise
            }, this );
        }
        return null;
    }
};


module.exports = CreateMarkerWorkflow;
