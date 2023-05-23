/** @typedef {import( '../editor.js' )} MapVisualEditor */
const VePanel = require( './base.js' ),
    DataEditorUiBuilder = require( '../data/editor.js' ),
    { Util } = require( 'ext.datamaps.core' );


module.exports = class MarkerCategoriesEditorPanel extends VePanel {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( editor, 'datamap-ve-panel-mcats' );

        this.contentElement.innerHTML = `
            <p style="text-align: center">This panel will be implemented in a future release.</p>
        `;
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
