const Util = require( './util.js' ),
    MarkerLegendPanel = require( './markerLegend.js' );


class CollectibleMarkerGroup {
    constructor( panel, group ) {
        this.panel = panel;
        this.group = group;
        this.markers = [];

        if ( group.legendIcon ) {
            this.$icon = $( '<img width=24 height=24 class="datamap-legend-group-icon" />' ).attr( 'src', group.legendIcon );
        } else {
            this.$icon = $( '<div class="datamap-legend-circle">' ).css( {
                width: group.size+4,
                height: group.size+4,
                backgroundColor: group.fillColor,
                borderColor: group.strokeColor || group.fillColor,
                borderWidth: group.strokeWidth || 1,
            } );
        }

        this.container = new OO.ui.Widget( {
            classes: [ 'datamap-collectible-group-markers' ]
        } );

        this.$element = new OO.ui.PanelLayout( {
            framed: true,
            expanded: false,
            content: [
                new OO.ui.PanelLayout( {
                    padded: true,
                    expanded: false,
                    classes: [ 'datamap-collectible-group-header' ],
                    content: [
                        this.$icon,
                        new OO.ui.LabelWidget( {
                            label: group.name
                        } )
                    ]
                } ),
                this.container
            ]
        } ).$element;

        this.buttonGroup = new OO.ui.ButtonGroupWidget( {} );
        // Prepend the button group to the root element
        this.buttonGroup.$element.prependTo( this.container.$element );

        MarkerLegendPanel.prototype.createActionButton.call( this, mw.msg( 'datamap-checklist-collect-all' ),
            this.toggleAll.bind( this, true ) );
        MarkerLegendPanel.prototype.createActionButton.call( this, mw.msg( 'datamap-checklist-uncollect-all' ),
            this.toggleAll.bind( this, false ) );
    }

    toggleAll( newState ) {
        for ( const marker of this.markers ) {
            if ( newState != marker.leafletMarker.options.dismissed ) {
                this.panel.map.toggleMarkerDismissal( marker.leafletMarker );
            }
        }
    }

    push( leafletMarker ) {
        this.markers.push( new CollectibleMarkerEntry( this, leafletMarker ) );
    }

    sort() {
        this.markers.sort( ( a, b ) => {
            if ( a.apiInstance[0] == b.apiInstance[0] ) {
                return a.apiInstance[1] > b.apiInstance[1];
            }
            return a.apiInstance[0] > b.apiInstance[0];
        } );
        for ( const marker of this.markers ) {
            marker.field.$element.appendTo( this.container.$element );
        }
    }

    replicateMarkerState( leafletMarker ) {
        for ( const marker of this.markers ) {
            if ( marker.leafletMarker == leafletMarker ) {
                marker.checkbox.setSelected( leafletMarker.options.dismissed, true );
                break;
            }
        }
    }
}


class CollectibleMarkerEntry {
    constructor( markerGroup, leafletMarker ) {
        this.markerGroup = markerGroup;
        this.panel = this.markerGroup.panel;
        this.apiInstance = leafletMarker.apiInstance;
        this.slots = this.apiInstance[2] || {};
        this.leafletMarker = leafletMarker;

        const pair = this.panel.legend.createCheckboxField( this.markerGroup.container.$element, '...',
            leafletMarker.options.dismissed, _ => this.panel.map.toggleMarkerDismissal( this.leafletMarker ) );
        this.field = pair[1];
        this.checkbox = pair[0];

        this.$label = this.field.$label;
        this.$label.empty();

        if ( this.panel.map.isFeatureBitSet( this.panel.map.FF_SHOW_COORDINATES ) ) {
            $( '<b>' ).text( this.panel.map.getCoordLabel( this.apiInstance ) ).appendTo( this.$label );
        }
        if ( this.slots.label ) {
            $( '<span>' ).html( this.slots.label ).appendTo( this.$label );
        }

        this.field.$header.on( 'click', event => {
            this.leafletMarker.openPopup();
            event.preventDefault( true );
        } );
    }
}


class CollectiblesLegend {
    constructor( legend ) {
        this.legend = legend;
        this.map = this.legend.map;

        this.map.on( 'markerDismissChange', this.updateGroupBadges, this );
        this.map.on( 'streamingDone', this.updateGroupBadges, this );

        // Root DOM element
        this.$root = this.legend.addTab( mw.msg( 'datamap-legend-tab-checklist' ), 'datamap-container-collectibles' ).$element;
        //
        this.groups = {};

        // Insert an introduction paragraph
        this.$root.append( mw.msg( 'datamap-checklist-prelude' ) );

        // Register event handlers
        this.map.on( 'markerDismissChange', this.onDismissalChange, this );
        this.map.on( 'markerReady', this.pushMarker, this );
        this.map.on( 'streamingDone', this.sort, this );

        // Call updaters now to bring the main panel in sync
        this.updateGroupBadges();

        // Prepare the checklist panel
        this._initialisePanel();

        // Import existing markers if any have been loaded
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[groupName];
            if ( group.collectible ) {
                for ( const leafletMarker of ( this.map.layerManager.byLayer[groupName] || [] ) ) {
                    this.pushMarker( leafletMarker );
                }
            }
        }
        this.sort();
    }


    _initialisePanel() {
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[groupName];
            if ( group.collectible ) {
                this.groups[groupName] = new CollectibleMarkerGroup( this, group );
                this.groups[groupName].$element.appendTo( this.$root );
            }
        }
    }


    pushMarker( leafletMarker ) {
        if ( this.map.config.groups[leafletMarker.attachedLayers[0]].collectible )
            this.groups[leafletMarker.attachedLayers[0]].push( leafletMarker );
    }


    sort() {
        for ( const group of Object.values( this.groups ) ) {
            group.sort();
        }
    }


    onDismissalChange( leafletMarker ) {
        this.groups[leafletMarker.attachedLayers[0]].replicateMarkerState( leafletMarker );
    }


    updateGroupBadges() {
        for ( const groupId in this.map.config.groups ) {
            const group = this.map.config.groups[groupId];
            const markers = this.map.layerManager.byLayer[groupId];
            if ( group.collectible && markers && this.map.markerLegend.groupToggles[groupId] ) {
                const count = markers.filter( x => x.options.dismissed ).length;
                this.map.markerLegend.groupToggles[groupId].setBadge( `${count} / ${markers.length}` );
            }
        }
    }
};


module.exports = CollectiblesLegend;