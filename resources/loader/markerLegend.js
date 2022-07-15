const DIM_HOVER_DELAY = 750;


function MarkerLegendPanel( legend, name ) {
    this.legend = legend;
    this.map = this.legend.map;
    // Root DOM element
    this.$root = this.legend.addTab( name ).$element;
    //
    this.buttonGroup = new OO.ui.ButtonGroupWidget( {} );
    //
    this.$groupContainer = $( '<div class="datamap-container-groups">' ).appendTo( this.$root );
    //
    this.groupToggles = [];
    // 
    this.$layersPopup = null;

    // Prepend the button group to the root element
    this.buttonGroup.$element.prependTo( this.$root );
}


MarkerLegendPanel.prototype.createActionButton = function ( label, clickCallback ) {
    const button = new OO.ui.ButtonWidget( { label: label } );
    button.on( 'click', clickCallback );
    this.buttonGroup.addItems( [ button ] );
    return button;
};


MarkerLegendPanel.prototype.createPopupButton = function ( label ) {
    const $content = $( '<div>' );
    const button = new OO.ui.PopupButtonWidget( { 
        label: label,
        indicator: 'down',
        popup: {
            $content: $content,
            padded: true,
            width: 220,
            align: 'forwards'
        }
    } );
    this.buttonGroup.addItems( [ button ] );
    return [ button, $content ];
};


MarkerLegendPanel.prototype.toggleAllGroups = function ( state ) {
    this.groupToggles.forEach( checkbox => checkbox.setSelected( state ) );
};


MarkerLegendPanel.prototype.usingTotalToggles = function () {
    this.createActionButton( mw.msg( 'datamap-toggle-show-all' ), this.toggleAllGroups.bind( this, true ) );
    this.createActionButton( mw.msg( 'datamap-toggle-hide-all' ), this.toggleAllGroups.bind( this, false ) );
};


MarkerLegendPanel.prototype.initialiseLayersArea = function () {
    this.$layersPopup = this.createPopupButton( mw.msg( 'datamap-layer-control' ) )[1];
};


MarkerLegendPanel.prototype.addMarkerLayerToggleExclusive = function ( layerId, layerName ) {
    this.legend.createCheckboxField( this.$layersPopup, layerName, true,
        state => this.map.layerManager.setExclusion( layerId, !state ) );
};

MarkerLegendPanel.prototype.addMarkerLayerToggleInclusive = function ( layerId, layerName, invert ) {
    this.legend.createCheckboxField( this.$layersPopup, layerName, true,
        state => this.map.layerManager.setInclusion( layerId, ( invert ? state : !state ) ) );
};


MarkerLegendPanel.prototype.addMarkerGroupToggle = function ( groupId, group ) {
    const pair = this.legend.createCheckboxField( this.$groupContainer, group.name, true,
        state => this.map.layerManager.setExclusion( groupId, !state ) );
    const field = pair[1];

    if ( group.fillColor ) {
        $( '<div class="datamap-legend-circle">' ).css( {
            width: group.size+4,
            height: group.size+4,
            backgroundColor: group.fillColor,
            borderColor: group.strokeColor || group.fillColor,
            borderWidth: group.strokeWidth || 1,
        } ).prependTo( field.$header );
    }

    if ( group.legendIcon ) {
        field.$header.prepend( $( '<img width=24 height=24/>' ).attr( 'src', group.legendIcon ) );
    }

    // Set up handlers to dim map and highlight this group
    field.$element.hover( () => {
        // Mouse entered
        field.timeoutId = setTimeout( () => {
            field.timeoutId = null;
            field.$element.attr( 'data-dimming', true );
            console.log(field.$element);
            this.map.layerManager.setDim( groupId, true );
        }, DIM_HOVER_DELAY );
    }, () => {
        // Mouse left
        if ( field.timeoutId ) {
            clearTimeout( field.timeoutId );
            field.timeoutId = null;
        } else {
            field.$element.attr( 'data-dimming', null );
            this.map.layerManager.setDim( groupId, false );
        }
    } );

    this.groupToggles.push( pair[0] );
};


module.exports = MarkerLegendPanel;