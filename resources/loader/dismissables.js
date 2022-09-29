const Enums = require( './enums.js' ),
    Util = require( './util.js' ),
    MarkerLegendPanel = require( './markerLegend.js' );


class CollectibleMarkerGroup {
    constructor( panel, group ) {
        this.panel = panel;
        this.map = this.panel.map;
        this.group = group;
        this.markers = [];

        if ( group.legendIcon ) {
            this.$icon = Util.createGroupIconElement( group );
        } else {
            this.$icon = Util.createGroupCircleElement( group );
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
                this.map.toggleMarkerDismissal( marker.leafletMarker );
            }
        }
    }


    push( leafletMarker ) {
        this.markers.push( new CollectibleMarkerEntry( this, leafletMarker ) );
    }


    sort() {
        let sortKey;
        switch ( this.map.crsOrigin ) {
            case Enums.CRSOrigin.TopLeft:
                sortKey = ( a, b ) => {
                    if ( a.apiInstance[0] == b.apiInstance[0] ) {
                        return a.apiInstance[1] > b.apiInstance[1];
                    }
                    return a.apiInstance[0] > b.apiInstance[0];
                };
                break;
            case Enums.CRSOrigin.BottomLeft:
                sortKey = ( a, b ) => {
                    if ( a.apiInstance[0] == b.apiInstance[0] ) {
                        return a.apiInstance[1] < b.apiInstance[1];
                    }
                    return a.apiInstance[0] < b.apiInstance[0];
                };
                break;
        };

        this.markers.sort( sortKey );
        
        for ( let index = 0; index < this.markers.length; index++ ) {
            const marker = this.markers[index];
            marker.field.$element.appendTo( this.container.$element );
            if ( marker.$index ) {
                marker.setIndex( index+1 );
            }
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

        // Build the label
        const areCoordsEnabled = this.panel.map.isFeatureBitSet( this.panel.map.FF_SHOW_COORDINATES );
        // Coordinates
        if ( areCoordsEnabled ) {
            this.$coordLabel = $( '<b>' ).text( this.panel.map.getCoordLabel( this.apiInstance ) ).appendTo( this.$label );
        }
        // Marker label
        this.$labelText = $( '<span>' ).appendTo( this.$label );
        if ( this.slots.label ) {
            this.$labelText.html( this.slots.label );
        }

        if ( Util.isBitSet( this.markerGroup.group.flags, Enums.MarkerGroupFlags.IsNumberedInChecklists ) ) {
            this.$index = $( '<span class="datamap-collapsible-index">' ).appendTo( this.$labelText );
            this.setIndex( this.markerGroup.markers.length + 1 );
        }

        this.field.$header.on( 'click', event => {
            this.leafletMarker.openPopup();
            event.preventDefault( true );
        } );
    }


    setIndex( index ) {
        this.$index.text( ' #' + index );
    }
}


class CollectiblesLegend {
    constructor( legend ) {
        this.legend = legend;
        this.map = this.legend.map;

        // Root DOM element
        this.$root = this.legend.addTab( mw.msg( 'datamap-legend-tab-checklist' ), 'datamap-container-collectibles' ).$element;
        //
        this.groups = {};

        this.suppressBadgeUpdates = true;

        // Insert an introduction paragraph
        this.$root.append( mw.msg( 'datamap-checklist-prelude' ) );

        // Prepare the checklist panel
        this._initialisePanel();

        // Register event handlers
        this.map.on( 'markerDismissChange', this.updateGroupBadges, this );
        this.map.on( 'markerDismissChange', this.onDismissalChange, this );
        this.map.on( 'markerReady', this.pushMarker, this );
        this.map.on( 'streamingDone', this.sort, this );
        this.map.on( 'streamingDone', () => {
            this.suppressBadgeUpdates = false;
        }, this );
        this.map.on( 'streamingDone', this.updateGroupBadges, this );

        // Call updaters now to bring the main panel in sync
        this.updateGroupBadges( true );

        // Import existing markers if any have been loaded
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[groupName];
            if ( Util.getGroupCollectibleType( group ) ) {
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
            if ( Util.getGroupCollectibleType( group ) ) {
                this.groups[groupName] = new CollectibleMarkerGroup( this, group );
                this.groups[groupName].$element.appendTo( this.$root );
            }
        }
    }


    pushMarker( leafletMarker ) {
        if ( Util.getGroupCollectibleType( this.map.config.groups[leafletMarker.attachedLayers[0]] ) ) {
            this.groups[leafletMarker.attachedLayers[0]].push( leafletMarker );
        }
    }


    sort() {
        for ( const group of Object.values( this.groups ) ) {
            group.sort();
        }

        if ( this.map.isFeatureBitSet( this.map.FF_SORT_CHECKLISTS_BY_AMOUNT ) ) {
            const groups = Object.values( this.groups ).sort( ( a, b ) => a.markers.length > b.markers.length );
            for ( const group of groups ) {
                group.$element.appendTo( this.$root );
            }
        }
    }


    onDismissalChange( leafletMarker ) {
        this.groups[leafletMarker.attachedLayers[0]].replicateMarkerState( leafletMarker );
    }


    updateGroupBadges( force ) {
        if ( !force && this.suppressBadgeUpdates ) {
            return;
        }

        for ( const groupId in this.groups ) {
            const markers = this.map.layerManager.byLayer[groupId];
            if ( markers && this.map.markerLegend.groupToggles[groupId] ) {
                const count = markers.filter( x => x.options.dismissed ).length,
                    mode = Util.getGroupCollectibleType( this.map.config.groups[groupId] );
                let text = mode == Enums.MarkerGroupFlags.Collectible_Individual ? `${count} / ${markers.length}` : '';
                if ( count > 0 && count === markers.length ) {
                    text += '✓';
                }

                this.map.markerLegend.groupToggles[groupId].setBadge( text );
            }
        }
    }
};


module.exports = CollectiblesLegend;