const Util = require( './util.js' );


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
            marker.field.$element.remove();
            marker.field.$element.appendTo( this.container.$element );
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
            leafletMarker.options.dismissed, _ => this.panel.map.toggleMarkerDismissal( leafletMarker ) );
        this.field = pair[1];
        this.checkbox = pair[0];

        this.$label = this.field.$label;
        this.$label.empty();
        $( '<b>' ).text( this.panel.map.getCoordLabel( this.apiInstance ) ).appendTo( this.$label );
        if ( this.slots.label ) {
            $( '<span>' ).text( this.slots.label ).appendTo( this.$label );
        }
    }
}


class CollectiblesLegend {
    constructor( legend ) {
        this.legend = legend;
        this.map = this.legend.map;

        this.map.on( 'markerDismissChange', this.updateGroupBadges, this );
        this.map.on( 'streamingDone', this.updateGroupBadges, this );

        if ( Util.isBleedingEdge ) {
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

            // Prepare the panel
            this._initialisePanel();

            // Import existing markers if any have been loaded
            for ( const groupName in this.map.config.groups ) {
                const group = this.map.config.groups[groupName];
                if ( group.canDismiss ) {
                    for ( const leafletMarker of ( this.map.layerManager.byLayer[groupName] || [] ) ) {
                        this.pushMarker( leafletMarker );
                    }
                }
            }

            this.sort();
        }

        // Call updaters now to bring the panel in sync
        this.updateGroupBadges();
    }


    _initialisePanel() {
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[groupName];
            if ( group.canDismiss ) {
                this.groups[groupName] = new CollectibleMarkerGroup( this, group );
                this.groups[groupName].$element.appendTo( this.$root );
            }
        }
    }


    pushMarker( leafletMarker ) {
        if ( this.map.config.groups[leafletMarker.attachedLayers[0]].canDismiss )
            this.groups[leafletMarker.attachedLayers[0]].push( leafletMarker );
    }


    sort() {
        for ( const group of Object.values( this.groups ) ) {
            group.sort();
        }
    }


    onDismissalChange( leafletMarker ) {

    }


    updateGroupBadges() {
        for ( const groupId in this.map.config.groups ) {
            const group = this.map.config.groups[groupId];
            const markers = this.map.layerManager.byLayer[groupId];
            if ( group.canDismiss && markers && this.map.markerLegend.groupToggles[groupId] ) {
                const count = markers.filter( x => x.options.dismissed ).length;
                this.map.markerLegend.groupToggles[groupId].setBadge( `${count} / ${markers.length}` );
            }
        }
    }
};


module.exports = CollectiblesLegend;