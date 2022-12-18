const Enums = require( './enums.js' ),
    Util = require( './util.js' );


class MarkerFilteringPanel {
    constructor( legend, name, addTotalToggles, withLayerDropdown ) {
        this.legend = legend;
        this.map = this.legend.map;
        // Root DOM element
        this.tab = this.legend.addTab( name, null, false );
        this.$root = this.tab.$element;
        //
        this.buttonGroup = new OO.ui.ButtonGroupWidget( {} );
        //
        this.$groupContainer = $( '<div class="datamap-container-groups">' ).appendTo( this.$root );
        //
        this.groupToggles = {};
        //
        this.$layersPopup = null;

        // Prepend the button group to the root element
        this.buttonGroup.$element.prependTo( this.$root );

        if ( addTotalToggles ) {
            this.createActionButton( mw.msg( 'datamap-toggle-show-all' ), this.toggleAllGroups.bind( this, true ) );
            this.createActionButton( mw.msg( 'datamap-toggle-hide-all' ), this.toggleAllGroups.bind( this, false ) );
        }

        if ( withLayerDropdown ) {
            this.$layersPopup = this.createPopupButton( mw.msg( 'datamap-layer-control' ) )[ 1 ];
        }
    }


    createActionButton( label, clickCallback ) {
        const button = new OO.ui.ButtonWidget( { label: label } );
        button.on( 'click', clickCallback );
        this.buttonGroup.addItems( [ button ] );
        return button;
    }


    createPopupButton( label ) {
        const $content = $( '<div>' );
        const button = new OO.ui.PopupButtonWidget( {
            label,
            indicator: 'down',
            popup: {
                $content,
                padded: true,
                width: 220,
                align: 'forwards'
            }
        } );
        this.buttonGroup.addItems( [ button ] );
        return [ button, $content ];
    }


    toggleAllGroups( state ) {
        // eslint-disable-next-line compat/compat
        for ( const toggle of Object.values( this.groupToggles ) ) {
            toggle.checkbox.setSelected( state );
        }
    }


    addMarkerLayerToggleExclusive( $parent, layerId, layerName ) {
        this.legend.createCheckboxField( $parent, layerName, true,
            state => this.map.layerManager.setExclusion( layerId, !state ) );
    }


    addMarkerLayerToggleInclusive( $parent, layerId, layerName, invert ) {
        this.legend.createCheckboxField( $parent, layerName, true,
            state => this.map.layerManager.setInclusion( layerId, ( invert ? state : !state ) ) );
    }


    addMarkerLayerToggleRequired( $parent, layerId, layerName, invert ) {
        this.legend.createCheckboxField( $parent, layerName, true,
            state => this.map.layerManager.setRequirement( layerId, ( invert ? state : !state ) ) );
    }


    addMarkerGroupToggle( groupId, group ) {
        this.groupToggles[ groupId ] = new MarkerFilteringPanel.MarkerGroupField( this, groupId, group );
        this.legend.setTabVisibility( this.tab, true );
    }


    includeGroups( ids ) {
        for ( const groupId of ids ) {
            this.addMarkerGroupToggle( groupId, this.map.config.groups[ groupId ] );
        }
    }
}


MarkerFilteringPanel.MarkerGroupField = class MarkerGroupField {
    constructor( legendPanel, groupId, group ) {
        this.legendPanel = legendPanel;
        this.legend = this.legendPanel.legend;
        this.map = this.legendPanel.map;
        this.groupId = groupId;

        // Create a backing checkbox field
        const pair = this.legend.createCheckboxField( this.legendPanel.$groupContainer, group.name,
            !Util.isBitSet( group.flags, Enums.MarkerGroupFlags.IsUnselected ),
            state => this.map.layerManager.setExclusion( this.groupId, !state ) );
        this.field = pair[ 1 ];
        this.checkbox = pair[ 0 ];

        // Optional elements
        this.$circle = null;
        this.$badge = null;
        this.$icon = null;

        // Add a coloured circle if circle marker group
        if ( group.fillColor ) {
            this.$circle = Util.createGroupCircleElement( group ).prependTo( this.field.$header );
        }

        // Add a pin icon if pin marker group
        if ( group.pinColor ) {
            this.$pin = Util.createGroupPinIconElement( group ).prependTo( this.field.$header );
        }

        // Add an icon if one is specified in the group
        if ( group.legendIcon ) {
            this.$icon = Util.createGroupIconElement( group ).prependTo( this.field.$header );
        }
    }


    setBadge( text ) {
        if ( text && text.length > 0 ) {
            if ( this.$badge === null ) {
                this.$badge = $( '<span class="datamap-legend-badge">' ).appendTo( this.field.$header );
            }
            this.$badge.text( text );
        } else if ( this.$badge ) {
            this.$badge.remove();
            this.$badge = null;
        }
    }
};


module.exports = MarkerFilteringPanel;
