/** @typedef {import( '../editor.js' )} MapVisualEditor */
const { VeWorkflow, DialogController } = require( './base.js' ),
    DataEditorUiBuilder = require( '../data/editor.js' ),
    { DataMap, Util } = require( 'ext.datamaps.core' ),
    ToolBarControl = require( '../toolControl.js' ),
    NamedPageLayout = require( '../ooui/NamedPageLayout.js' ),
    MarkerDataService = require( '../data/markerService.js' );


class CreateMarkerWorkflow extends VeWorkflow {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( CreateMarkerWorkflow.Dialog, editor, {
            id: 'create-marker',
            msg: 'datamap-ve-workflow-marker',
            icon: 'mapPin',
            anchor: DataMap.anchors.veToolBar
        } );
    }
}


/**
 * @template {any} TOptionsType
 * @extends {DialogController< 'save', TOptionsType >}
 */
CreateMarkerWorkflow.BaseMarkerDialog = class BaseMarkerDialogController extends DialogController {
    /**
     * @param {MapVisualEditor} editor
     * @param {string} messageKey
     * @param {OO.ui.ProcessDialog} dialog
     * @param {TOptionsType?} contextData
     */
    constructor( editor, messageKey, dialog, contextData ) {
        super( editor, messageKey, dialog, contextData );

        /**
         * @protected
         * @type {MarkerDataService}
         */
        this._dataService = this.editor.getService( MarkerDataService );
    }


    /**
     * @return {OO.ui.Window.Size}
     */
    static getSize() {
        return 'large';
    }


    /**
     * @abstract
     * @return {string}
     */
    static getSubmitButtonMessageKey() {
        throw new Error( 'BaseMarkerDialogController#getSubmitButtonMessageKey not implemented' );
    }


    /**
     * @protected
     * @return {OO.ui.ActionWidget.ConfigOptions[]}
     */
    static getActions() {
        return [
            {
                action: 'save',
                label: mw.msg( 'datamap-ve-workflow-marker-' + this.getSubmitButtonMessageKey() ),
                flags: [ 'primary', 'progressive' ],
                modes: [ 'first' ]
            },
            Object.assign( DialogController.CLOSE_ACTION, /** @type {OO.ui.ActionWidget.ConfigOptions} */ ( {
                modes: [ 'first' ]
            } ) )
        ];
    }


    /**
     * @abstract
     * @return {}
     */
    getTargetObject() {
        throw new Error( 'BaseMarkerDialogController#getTargetObject not implemented' );
    }


    getBodyHeight() {
        return 450;
    }


    build() {
        this._layout = new OO.ui.BookletLayout( {
            outlined: true
        } ).addPages( [
            this._buildAssociationPanel(),
            this._buildPopupPanel()
        ] );
        this._layout.$element.appendTo( this.contentElement );
    }


    /**
     * @return {boolean}
     */
    usesXyCoordinates() {
        const coordOrderValue = this.editor.dataCapsule.get().coordinateOrder || 'latlon',
            obj = this.getTargetObject();
        return !( 'lat' in obj && 'lon' in obj )
            && ( ( 'x' in obj && 'y' in obj ) || coordOrderValue === 'xy' || coordOrderValue === 'yx' );
    }


    /**
     * @return {boolean}
     */
    isYCoordinateFirst() {
        const coordOrderValue = this.editor.dataCapsule.get().coordinateOrder || 'latlon';
        return coordOrderValue === 'latlon' || coordOrderValue === 'yx';
    }


    /**
     * @protected
     * @return {NamedPageLayout}
     */
    _buildAssociationPanel() {
        const isXy = this.usesXyCoordinates(),
            isYFirst = this.isYCoordinateFirst();

        let
            /** @type {(DataEditorUiBuilder.AbstractField & DataEditorUiBuilder.NumberFieldProps)[]} */ locationFields = [
                {
                    type: 'number',
                    labelMsg: isXy ? 'field-x' : 'field-lon',
                    property: isXy ? 'x' : 'lon',
                    required: true,
                    default: undefined
                },
                {
                    type: 'number',
                    labelMsg: isXy ? 'field-y' : 'field-lat',
                    property: isXy ? 'y' : 'lat',
                    required: true,
                    default: undefined
                }
            ];
        if ( isYFirst ) {
            locationFields = [ locationFields[ 1 ], locationFields[ 0 ] ];
        }
        this._locationUiBuilder = new DataEditorUiBuilder( this.editor, this.messageKey, {
            label: this.msg( 'set-coordinates' ),
            horizontal: true,
            rootGetter: () => this.getTargetObject(),
            fields: locationFields
        } ).setLock( false );

        this._behaviourUiBuilder = new DataEditorUiBuilder( this.editor, this.messageKey, {
            label: this.msg( 'set-behaviour' ),
            rootGetter: () => this.getTargetObject(),
            fields: [
                {
                    type: 'text',
                    labelMsg: 'field-id',
                    property: 'id',
                    required: this.editor.doesRequireMarkerIds(),
                    // TODO: display the generated ID instead
                    placeholder: this.editor.doesRequireMarkerIds() ? undefined
                        : this.msg( 'field-id-desc' ),
                    default: ''
                }
            ]
        } ).setLock( false );

        this._groupDropdown = new OO.ui.DropdownInputWidget( {
            options: Object.entries( this.editor.map.config.groups ).map( pair => {
                return {
                    data: pair[ 0 ],
                    label: pair[ 1 ].name
                };
            } )
        } );

        return new NamedPageLayout( this.msg( 'panel-setup' ), {
            icon: 'tag',
            content: [
                this._locationUiBuilder.element,
                new OO.ui.FieldsetLayout( {
                    label: this.msg( 'set-association' ),
                    items: [
                        new OO.ui.FieldLayout( this._groupDropdown, {
                            label: this.msg( 'field-group' ),
                            help: this.msg( 'field-group-desc' )
                        } )
                        // TODO: layer association
                    ]
                } ),
                this._behaviourUiBuilder.element
            ]
        } );
    }


    /**
     * @protected
     * @return {NamedPageLayout}
     */
    _buildPopupPanel() {
        this._popupUiBuilder = new DataEditorUiBuilder( this.editor, this.messageKey, {
            rootGetter: () => this.getTargetObject(),
            fields: [
                {
                    type: 'text',
                    labelMsg: 'field-name',
                    property: 'name',
                    default: ''
                },
                {
                    type: 'longtext',
                    labelMsg: 'field-desc',
                    property: 'description',
                    default: ''
                },
                {
                    type: 'media',
                    labelMsg: 'field-image',
                    property: 'image',
                    default: ''
                }
            ]
        } ).setLock( false );

        return new NamedPageLayout( this.msg( 'panel-popup' ), {
            icon: 'article',
            content: [
                this._popupUiBuilder.element
            ]
        } );
    }
};


/**
 * @extends {CreateMarkerWorkflow.BaseMarkerDialog<any>}
 */
CreateMarkerWorkflow.Dialog = class CreateMarkerDialogController extends CreateMarkerWorkflow.BaseMarkerDialog {
    /**
     * @param {MapVisualEditor} editor
     * @param {string} messageKey
     * @param {OO.ui.ProcessDialog} dialog
     * @param {{}?} contextData
     */
    constructor( editor, messageKey, dialog, contextData ) {
        super( editor, messageKey, dialog, contextData );

        /**
         * @private
         */
        this._target = {};

        const latlng = Util.getNonNull( this.editor.getService( ToolBarControl ).latlng ),
            [ lat, lng ] = this.editor.map.translateLeafletCoordinates( latlng, true );
        this._dataService.setSourceCoordinates( this._target, lat, lng );
    }


    /**
     * @return {string}
     */
    static getSubmitButtonMessageKey() {
        return 'create';
    }


    /**
     * @abstract
     * @return {}
     */
    getTargetObject() {
        return this._target;
    }


    /**
     * @param {'save'} action
     * @return {OO.ui.Process?}
     */
    getActionProcess( action ) {
        if ( action === 'save' ) {
            return new OO.ui.Process( () => {
                this._dataService.create(
                    [ Util.getNonNull( this._groupDropdown ).getValue() ],
                    this._target
                );
                this.dialog.close();
            } );
        }
        return null;
    }
};


module.exports = CreateMarkerWorkflow;
