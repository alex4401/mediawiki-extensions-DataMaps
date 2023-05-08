/** @typedef {import( './editor.js' )} MapVisualEditor */
const { DataMap, MarkerPopup, Util } = require( 'ext.datamaps.core' ),
    MarkerDataService = require( './data/markerService.js' ),
    CreateMarkerWorkflow = require( './workflow/createMarker.js' ),
    DataEditorUiBuilder = require( './data/editor.js' ),
    DataCapsule = require( './dataCapsule.js' );


class EditableMarkerPopup extends MarkerPopup {
    /**
     * @param {InstanceType< DataMap >} map
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    constructor( map, leafletMarker ) {
        super( map, leafletMarker );

        /**
         * @private
         * @type {MapVisualEditor}
         */
        this._editor = this.slots.editor;
        /**
         * @private
         * @type {MarkerDataService}
         */
        this._dataService = this._editor.getService( MarkerDataService );
        /**
         * @private
         * @type {import( '../../schemas/src/index' ).Marker}
         */
        this._source = this._dataService.getLeafletMarkerSource( this.leafletMarker );
    }


    shouldKeepAround() {
        return false;
    }


    /**
     * Builds the buttons.
     *
     * @param {HTMLElement} element
     */
    buildButtons( element ) {
        Util.createDomElement( 'a', {
            classes: [ 'ext-datamaps-popup-ve-edit', 'oo-ui-icon-edit' ],
            attributes: {
                role: 'button',
                href: '#',
                title: mw.msg( 'datamap-ve-panel-marker-edit' )
            },
            events: {
                click: event => {
                    event.preventDefault();
                    // TODO: refactor into EditableMarkerPopup.Dialog.open( { ... } )
                    this._editor.windowManager.openWindow( 'mve-edit-marker', {
                        target: this.leafletMarker
                    } );
                }
            },
            appendTo: element
        } );
        Util.createDomElement( 'a', {
            classes: [ 'ext-datamaps-popup-ve-delete', 'oo-ui-icon-trash' ],
            attributes: {
                role: 'button',
                href: '#',
                title: mw.msg( 'datamap-ve-panel-marker-delete' )
            },
            events: {
                click: event => {
                    event.preventDefault();
                    this._dataService.remove( this.leafletMarker );
                }
            },
            appendTo: element
        } );
    }


    /**
     * Builds the action list of this popup.
     *
     * @param {HTMLElement} element
     */
    buildActions( element ) {
    }


    onAdd() {}
    onRemove() { }
}


/**
 * @typedef {Object} EditMarkerDialogData
 * @property {LeafletModule.AnyMarker} target
 */


/**
 * @extends {CreateMarkerWorkflow.BaseMarkerDialog<EditMarkerDialogData>}
 */
EditableMarkerPopup.Dialog = class EditMarkerDialogController extends CreateMarkerWorkflow.BaseMarkerDialog {
    /**
     * @param {MapVisualEditor} editor
     * @param {string} messageKey
     * @param {OO.ui.ProcessDialog} dialog
     * @param {EditMarkerDialogData} contextData
     */
    constructor( editor, messageKey, dialog, contextData ) {
        super( editor, messageKey, dialog, contextData );

        /**
         * @private
         * @type {LeafletModule.AnyMarker}
         */
        this._leafletMarker = contextData.target;
        /**
         * @private
         * @type {import( '../../schemas/src/index.js' ).Marker}
         */
        this._finalTarget = this._dataService.getLeafletMarkerSource( this._leafletMarker );
        /**
         * @private
         * @type {import( '../../schemas/src/index.js' ).Marker}
         */
        this._workingTarget = Object.assign( {}, this._finalTarget );

        this._leafletMarker.closePopup();
    }


    /**
     * @return {string}
     */
    static getSubmitButtonMessageKey() {
        return 'edit';
    }


    getTargetObject() {
        return this._workingTarget;
    }


    /**
     * @param {'save'} action
     * @return {OO.ui.Process?}
     */
    getActionProcess( action ) {
        if ( action === 'save' ) {
            return new OO.ui.Process( () => {
                let leafletMarker = this._leafletMarker;
                // Merge state and update
                Object.assign( this._finalTarget, this._workingTarget );
                this._dataService.syncRuntime( this._leafletMarker );
                // Move between groups if needed
                const targetGroup = Util.getNonNull( this._groupDropdown ).getValue();
                if ( this._leafletMarker.attachedLayers[ 0 ] !== targetGroup ) {
                    leafletMarker = this._dataService.moveToGroup( this._leafletMarker, targetGroup );
                }
                // Open popup again and close this dialog
                leafletMarker.openPopup();
                this.dialog.close();
            } );
        }
        return null;
    }
};


module.exports = EditableMarkerPopup;
