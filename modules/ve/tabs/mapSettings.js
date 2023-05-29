/** @typedef {import( '../editor.js' )} MapVisualEditor */
const VePanel = require( './base.js' ),
    DataEditorUiBuilder = require( '../data/editor.js' ),
    { Util } = require( 'ext.datamaps.core' );


module.exports = class MapSettingsEditorPanel extends VePanel {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( editor, 'datamap-ve-panel-msettings' );

        /**
         * @type {DataEditorUiBuilder}
         */
        this.uiBuilder = new DataEditorUiBuilder( editor, this._baseMsg, data => ( data.settings = data.settings || {} ) )
            .addSection( null, [
                {
                    type: 'dropdown',
                    labelMsg: 'field-coordorder',
                    rootOverride: data => data,
                    property: 'coordinateOrder',
                    options: [
                        [ 'latlon', 'latlon' ],
                        [ 'xy', 'xy' ]
                        // TODO: [ 'yx', 'yx' ]
                    ],
                    default: 0
                }
            ] )
            .addSection( 'view', [
                {
                    type: 'checkbox',
                    labelMsg: 'field-coordinates',
                    property: 'showCoordinates',
                    default: true
                },
                {
                    type: 'checkbox',
                    labelMsg: 'field-legend',
                    property: 'hideLegend',
                    default: false
                },
                {
                    type: 'dropdown',
                    labelMsg: 'field-search',
                    property: 'enableSearch',
                    options: [
                        [ 'disabled', undefined ],
                        [ 'enabled', true ],
                        [ 'tabber', 'tabberWide' ]
                    ],
                    default: 0
                },
                {
                    type: 'dropdown',
                    labelMsg: 'field-sortchecklists',
                    property: 'sortChecklistsBy',
                    options: [
                        [ 'default', 'groupDeclaration' ],
                        [ 'amount', 'amount' ]
                    ],
                    default: 0
                },
                {
                    type: 'checkbox',
                    labelMsg: 'field-allowfullscreen',
                    property: 'allowFullscreen',
                    default: true
                },
                {
                    type: 'dropdown',
                    labelMsg: 'field-popupbehaviour',
                    property: 'enableTooltipPopups',
                    options: [
                        [ 'click', false ],
                        [ 'tooltip', true ]
                    ],
                    default: 0
                }
            ] )
            .addSection( 'edit', [
                {
                    type: 'checkbox',
                    labelMsg: 'field-requireids',
                    descMsg: 'field-requireids-desc',
                    property: 'requireCustomMarkerIDs',
                    default: false
                }
            ] );
        this.contentElement.appendChild( this.uiBuilder.element );
    }


    /**
     * @protected
     * @param {boolean} value
     */
    _setLock( value ) {
        this.uiBuilder.setLock( value );
    }


    /**
     * @protected
     */
    _cleanUpData() {
        const data = this.editor.dataCapsule.get();
        if ( Object.keys( data.settings ).length === 0 ) {
            // @ts-ignore: operand must be optional (incorrect schema)
            delete data.settings;
        }
    }
};
