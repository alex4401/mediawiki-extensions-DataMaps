/** @typedef {import( '../map.js' )} DataMap */
const LegendTabber = require( './tabber.js' ),
    { MarkerGroupFlags } = require( '../enums.js' ),
    Util = require( '../util.js' );


class MarkerFilteringPanel extends LegendTabber.Tab {
    /**
     * @param {LegendTabber} tabber
     * @param {boolean} addTotalToggles
     * @param {boolean} withLayerDropdown
     */
    constructor( tabber, addTotalToggles, withLayerDropdown ) {
        super( tabber, mw.msg( 'datamap-legend-tab-locations' ) );

        /**
         * Top button group for quick manipulation actions.
         *
         * @type {OO.ui.ButtonGroupWidget}
         */
        this.buttonGroup = new OO.ui.ButtonGroupWidget( {} );
        /**
         * Marker group container.
         *
         * @type {jQuery}
         */
        this.$groupContainer = $( '<div class="datamap-container-groups">' ).appendTo( this.$content );
        /**
         * Mapping of group IDs to {@link MarkerFilteringPanel.MarkerGroupField}.
         *
         * @type {Object<string, MarkerFilteringPanel.MarkerGroupField>}
         */
        this.groupToggles = {};
        /**
         * Layer toggles popup container.
         *
         * @type {jQuery?}
         */
        this.$layersPopup = null;

        // Prepend the button group to the root element
        this.buttonGroup.$element.prependTo( this.$content );

        if ( addTotalToggles ) {
            this.createActionButton( mw.msg( 'datamap-toggle-show-all' ), this.toggleAllGroups.bind( this, true ) );
            this.createActionButton( mw.msg( 'datamap-toggle-hide-all' ), this.toggleAllGroups.bind( this, false ) );
        }

        if ( withLayerDropdown ) {
            this.$layersPopup = this.createPopupButton( mw.msg( 'datamap-layer-control' ) )[ 1 ];
        }
    }


    /**
     * @param {string} label
     * @param {() => void} clickCallback
     * @return {OO.ui.ButtonWidget}
     */
    createActionButton( label, clickCallback ) {
        const button = new OO.ui.ButtonWidget( { label: label } );
        button.on( 'click', clickCallback );
        this.buttonGroup.addItems( [ button ] );
        return button;
    }


    /**
     * Creates a popup button and pushes into the button group.
     *
     * @param {string} label
     * @return {[ OO.ui.PopupButtonWidget, jQuery ]}
     */
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


    /**
     * Sets every group's visibility to {@link state}.
     *
     * @param {boolean} state
     */
    toggleAllGroups( state ) {
        for ( const toggle of Object.values( this.groupToggles ) ) {
            toggle.checkbox.setSelected( state );
        }
    }


    /**
     * @param {jQuery} $parent
     * @param {string} layerId
     * @param {string} layerName
     */
    addMarkerLayerToggleExclusive( $parent, layerId, layerName ) {
        this.tabber.createCheckboxField( $parent, layerName, true,
            state => this.map.layerManager.setExclusion( layerId, !state ) );
    }


    /**
     * @param {jQuery} $parent
     * @param {string} layerId
     * @param {string} layerName
     * @param {boolean} [invert]
     */
    addMarkerLayerToggleInclusive( $parent, layerId, layerName, invert ) {
        this.tabber.createCheckboxField( $parent, layerName, true,
            state => this.map.layerManager.setInclusion( layerId, ( invert ? state : !state ) ) );
    }


    /**
     * @param {jQuery} $parent
     * @param {string} layerId
     * @param {string} layerName
     * @param {boolean} [invert]
     */
    addMarkerLayerToggleRequired( $parent, layerId, layerName, invert ) {
        this.tabber.createCheckboxField( $parent, layerName, true,
            state => this.map.layerManager.setRequirement( layerId, ( invert ? state : !state ) ) );
    }


    /**
     * @param {string} groupId
     * @param {DataMaps.Configuration.MarkerGroup} group
     */
    addMarkerGroupToggle( groupId, group ) {
        this.groupToggles[ groupId ] = new MarkerFilteringPanel.MarkerGroupField( this, groupId, group );
        this.setVisible( true );
    }


    /**
     * @param {string[]} ids
     */
    includeGroups( ids ) {
        for ( const groupId of ids ) {
            this.addMarkerGroupToggle( groupId, this.map.config.groups[ groupId ] );
        }
    }
}


MarkerFilteringPanel.MarkerGroupField = class MarkerGroupField {
    /**
     * @param {MarkerFilteringPanel} legendPanel
     * @param {string} groupId
     * @param {DataMaps.Configuration.MarkerGroup} group
     */
    constructor( legendPanel, groupId, group ) {
        /**
         * @type {MarkerFilteringPanel}
         */
        this.legendPanel = legendPanel;
        /**
         * @type {LegendTabber}
         */
        this.legend = this.legendPanel.tabber;
        /**
         * @type {DataMap}
         */
        this.map = this.legend.map;
        /**
         * @type {string}
         */
        this.groupId = groupId;

        // Create a backing checkbox field
        const pair = this.legend.createCheckboxField( this.legendPanel.$groupContainer, group.name,
            !Util.isBitSet( group.flags, MarkerGroupFlags.IsUnselected ),
            state => this.map.layerManager.setExclusion( this.groupId, !state ) );
        /**
         * @type {OO.ui.FieldLayout}
         */
        this.field = pair[ 1 ];
        /**
         * @type {OO.ui.CheckboxInputWidget}
         */
        this.checkbox = pair[ 0 ];

        // Optional elements
        /**
         * @type {jQuery?}
         */
        this.$circle = null;
        /**
         * @type {jQuery?}
         */
        this.$badge = null;
        /**
         * @type {jQuery?}
         */
        this.$icon = null;

        // Add a coloured circle if circle marker group
        if ( 'fillColor' in group ) {
            this.$circle = Util.Groups.createCircleElement( group ).prependTo( this.field.$header );
        }

        // Add a pin icon if pin marker group
        if ( 'pinColor' in group ) {
            this.$pin = Util.Groups.createPinIconElement( group ).prependTo( this.field.$header );
        }

        // Add an icon if one is specified in the group
        if ( group.legendIcon ) {
            this.$icon = Util.Groups.createIconElement( group ).prependTo( this.field.$header );
        }
    }


    /**
     * @param {string?} text
     */
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
