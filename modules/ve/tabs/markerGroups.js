/** @typedef {import( '../editor.js' )} MapVisualEditor */
const VePanel = require( './base.js' ),
    DataEditorUiBuilder = require( '../data/editor.js' ),
    { Util } = require( 'ext.datamaps.core' );


class MarkerGroupsEditorPanel extends VePanel {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( editor, 'datamap-ve-panel-mgroups' );

        /**
         * @private
         * @type {HTMLElement}
         */
        this._rowList = Util.createDomElement( 'div', {
            classes: [ 'ext-datamaps-mve-mgroup-list' ],
            appendTo: this.contentElement
        } );
        /**
         * @private
         * @type {MarkerGroupsEditorPanel.Row[]}
         */
        this._rows = [];
        /**
         * @private
         * @type {HTMLElement}
         */
        this._addNewButton = Util.createDomElement( 'button', {
            classes: [ 'ext-datamaps-mve-mgroup-add' ],
            text: this.msg( 'add' ),
            appendTo: this.contentElement
        } );

        for ( const id of Object.keys( this.editor.map.config.groups ) ) {
            this._setupGroup( id );
        }
    }


    /**
     * @private
     * @param {string} id
     */
    _setupGroup( id ) {
        const row = new MarkerGroupsEditorPanel.Row( this, id );
        this._rows.push( row );
        this._rowList.appendChild( row.element );
    }


    /**
     * @protected
     * @param {boolean} value
     */
    _setLock( value ) {
        //this.uiBuilder.setLock( value );
    }


    /**
     * @protected
     */
    _cleanUpData() {
    }
};


MarkerGroupsEditorPanel.Row = class MarkerGroupEditorRow {
    /**
     * @param {MarkerGroupsEditorPanel} panel
     * @param {string} id
     */
    constructor( panel, id ) {
        /**
         * @private
         * @type {MapVisualEditor}
         */
        this._editor = panel.editor;
        /**
         * @private
         * @type {string}
         */
        this._groupId = id;
        /**
         * @private
         * @type {InternalExtensionTypes.Configuration.MarkerGroup}
         */
        this._config = this._editor.map.config.groups[ id ];
        /**
         * @type {HTMLElement}
         */
        this.element = Util.createDomElement( 'div', {
            classes: [ 'ext-datamaps-mve-mgroup-row' ]
        } );

        this._build();
    }


    _build() {
        /**
         * @private
         * @type {OO.ui.CheckboxInputWidget}
         */
        this._visibilityCheckbox = new OO.ui.CheckboxInputWidget( {

        } );
        /**
         * @private
         * @type {HTMLElement}
         */
        this._label = new OO.ui.LabelWidget( { } ).$element[ 0 ];
        /**
         * @private
         * @type {Element?}
         */
        this._icon = null;

        const field = new OO.ui.FieldLayout( this._visibilityCheckbox, {
            $label: $( this._label ),
            align: 'inline'
        } );
        this.element.appendChild( field.$element[ 0 ] );

        new OO.ui.ButtonGroupWidget( {
            items: [
                this._editButton = new OO.ui.ButtonWidget( {
                    icon: 'edit',
                    flags: [ 'progressive' ]
                } ),
                this._deleteButton = new OO.ui.ButtonWidget( {
                    icon: 'trash',
                    flags: [ 'destructive' ],
                    disabled: true,
                    title: '[PH] This will be implemented after GH#154'
                } )
            ]
        } ).$element.appendTo( field.$header );

        this._updateLabel();
    }


    _updateIcon() {
        if ( this._icon !== null ) {
            Util.getNonNull( this._label ).removeChild( /** @type {Node} */ ( this._icon ) );
        }

        this._icon = Util.Groups.createIcon( this._config );
        Util.getNonNull( this._label ).prepend( /** @type {Node} */ ( this._icon ) );
    }


    _updateLabel() {
        Util.getNonNull( this._label ).innerText = this._config.name;
        this._updateIcon();
    }
};


module.exports = MarkerGroupsEditorPanel;
