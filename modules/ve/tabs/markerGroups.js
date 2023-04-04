/** @typedef {import( '../editor.js' )} MapVisualEditor */
const VePanel = require( './base.js' ),
    { Util } = require( 'ext.datamaps.core' );


class MarkerGroupsEditorPanel extends VePanel {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        super( editor, 'datamap-ve-panel-mgroups' );
    }


    /**
     * @protected
     */
    _importValuesFromData() {
    }
}


MarkerGroupsEditorPanel.Row = class Row {

};


module.exports = MarkerGroupsEditorPanel;
