function MapLegend( map ) {
    this.map = map;
    // DOM element of the legend container
    this.$legendRoot = this.map.$root.find( '.datamap-container-legend' );
    // IndexLayout of the legend panel
    this.tabLayout = new OO.ui.IndexLayout( {
        expanded: false
    } );

    // Append the IndexLayout to the root
    this.tabLayout.$element.appendTo( this.$legendRoot );
}


/*
 * 
 */
MapLegend.prototype.addTab = function ( name, cssClass ) {
    const result = new OO.ui.TabPanelLayout( {
        name: name,
        label: name,
        expanded: false,
        classes: cssClass ? [ cssClass ] : []
    } );
    this.tabLayout.addTabPanels( [ result ] );
    return result;
};


MapLegend.prototype.createCheckboxField = function ( $parent, label, defaultState, changeCallback ) {
    const checkbox = new OO.ui.CheckboxInputWidget( { selected: defaultState } );
    const field = new OO.ui.FieldLayout( checkbox, {
        label: label,
        align: 'inline'
    } );
    checkbox.on( 'change', () => changeCallback( checkbox.isSelected() ) );
    field.$element.appendTo( $parent );
    return [ checkbox, field ];
};


module.exports = MapLegend;