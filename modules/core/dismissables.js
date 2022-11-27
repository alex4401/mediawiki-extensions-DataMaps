const Enums = require( './enums.js' ),
    Util = require( './util.js' );
const MarkerGroupFlags = Enums.MarkerGroupFlags,
    MapFlags = Enums.MapFlags;


class CollectiblesPanel {
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
        this.map.on( 'chunkStreamingDone', this.sort, this );
        this.map.on( 'chunkStreamingDone', () => {
            this.suppressBadgeUpdates = false;
        }, this );
        this.map.on( 'chunkStreamingDone', this.updateGroupBadges, this );

        // Call updaters now to bring the main panel in sync
        this.updateGroupBadges( true );

        // Import existing markers if any have been loaded
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[ groupName ];
            if ( Util.getGroupCollectibleType( group ) ) {
                for ( const leafletMarker of ( this.map.layerManager.byLayer[ groupName ] || [] ) ) {
                    this.pushMarker( leafletMarker );
                }
            }
        }
        this.sort();
    }


    _initialisePanel() {
        for ( const groupId in this.map.config.groups ) {
            const group = this.map.config.groups[ groupId ];
            if ( !this.map.isLayerFilteredOut( groupId ) && Util.getGroupCollectibleType( group ) ) {
                this.groups[ groupId ] = new CollectiblesPanel.MarkerGroup( this, group );
                this.groups[ groupId ].$element.appendTo( this.$root );
            }
        }
    }


    pushMarker( leafletMarker ) {
        if ( Util.getGroupCollectibleType( this.map.config.groups[ leafletMarker.attachedLayers[ 0 ] ] ) ) {
            this.groups[ leafletMarker.attachedLayers[ 0 ] ].push( leafletMarker );
        }
    }


    sort() {
        // eslint-disable-next-line compat/compat
        for ( const group of Object.values( this.groups ) ) {
            group.sort();
        }

        if ( this.map.isFeatureBitSet( MapFlags.SortChecklistsByAmount ) ) {
            const groups = Object.values( this.groups ).sort( ( a, b ) => a.markers.length > b.markers.length );
            for ( const group of groups ) {
                group.$element.appendTo( this.$root );
            }
        }
    }


    onDismissalChange( leafletMarker ) {
        this.groups[ leafletMarker.attachedLayers[ 0 ] ].replicateMarkerState( leafletMarker );
    }


    updateGroupBadges( force ) {
        if ( !force && this.suppressBadgeUpdates ) {
            return;
        }

        for ( const groupId in this.groups ) {
            const markers = this.map.layerManager.byLayer[ groupId ];
            if ( markers && this.map.markerLegend.groupToggles[ groupId ] ) {
                const count = markers.filter( x => x.options.dismissed ).length,
                    mode = Util.getGroupCollectibleType( this.map.config.groups[ groupId ] );
                let text = mode === MarkerGroupFlags.Collectible_Individual ? `${count} / ${markers.length}` : '';
                if ( count > 0 && count === markers.length ) {
                    text += '✓';
                }

                this.map.markerLegend.groupToggles[ groupId ].setBadge( text );
            }
        }
    }
}


CollectiblesPanel.MarkerGroup = class MarkerGroup {
    constructor( panel, group ) {
        this.panel = panel;
        this.map = this.panel.map;
        this.group = group;
        this.markers = [];
        this.isIndividual = Util.getGroupCollectibleType( group ) === MarkerGroupFlags.Collectible_Individual;

        if ( group.legendIcon ) {
            this.$icon = Util.createGroupIconElement( group );
        } else {
            this.$icon = Util.createGroupCircleElement( group );
        }

        this.container = new OO.ui.Widget( {
            classes: [ 'datamap-collectible-group-markers' ]
        } );

        this.checkbox = new OO.ui.CheckboxInputWidget( {
            selected: false
        } );
        this.checkbox.on( 'change', () => this.toggleAll( this.checkbox.isSelected() ) );

        this.$element = new OO.ui.PanelLayout( {
            framed: true,
            expanded: false,
            content: [
                new OO.ui.PanelLayout( {
                    padded: true,
                    expanded: false,
                    classes: [ 'datamap-collectible-group-header' ],
                    content: [
                        this.checkbox,
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


    toggleAll( newState ) {
        for ( const marker of this.markers ) {
            if ( newState !== marker.leafletMarker.options.dismissed ) {
                this.map.toggleMarkerDismissal( marker.leafletMarker );
            }
        }
    }


    push( leafletMarker ) {
        this.markers.push( new CollectiblesPanel.MarkerEntry( this, leafletMarker ) );
        this.updateCheckboxState();
    }


    sort() {
        let sortKey;
        switch ( this.map.crsOrigin ) {
            case Enums.CRSOrigin.TopLeft:
                sortKey = ( a, b ) => {
                    if ( a.apiInstance[ 0 ] === b.apiInstance[ 0 ] ) {
                        return a.apiInstance[ 1 ] > b.apiInstance[ 1 ];
                    }
                    return a.apiInstance[ 0 ] > b.apiInstance[ 0 ];
                };
                break;
            case Enums.CRSOrigin.BottomLeft:
                sortKey = ( a, b ) => {
                    if ( a.apiInstance[ 0 ] === b.apiInstance[ 0 ] ) {
                        return a.apiInstance[ 1 ] < b.apiInstance[ 1 ];
                    }
                    return a.apiInstance[ 0 ] < b.apiInstance[ 0 ];
                };
                break;
        }

        this.markers.sort( sortKey );

        for ( let index = 0; index < this.markers.length; index++ ) {
            const marker = this.markers[ index ];
            marker.field.$element.appendTo( this.container.$element );
            if ( marker.$index ) {
                marker.setIndex( index + 1 );
            }
        }
    }


    replicateMarkerState( leafletMarker ) {
        for ( const marker of this.markers ) {
            if ( marker.leafletMarker === leafletMarker ) {
                marker.checkbox.setSelected( leafletMarker.options.dismissed, true );
                break;
            }
        }
        this.updateCheckboxState();
    }


    updateCheckboxState() {
        this.checkbox.setSelected( this.markers.every( x => x.leafletMarker.options.dismissed ), true );
    }
};


CollectiblesPanel.MarkerEntry = class MarkerEntry {
    constructor( markerGroup, leafletMarker ) {
        this.markerGroup = markerGroup;
        this.panel = this.markerGroup.panel;
        this.apiInstance = leafletMarker.apiInstance;
        this.slots = this.apiInstance[ 2 ] || {};
        this.leafletMarker = leafletMarker;
        this.isIndividual = this.markerGroup.isIndividual;

        const pair = this.panel.legend.createCheckboxField( this.markerGroup.container.$element, '...',
            leafletMarker.options.dismissed, () => this.panel.map.toggleMarkerDismissal( this.leafletMarker ) );
        this.field = pair[ 1 ];
        this.checkbox = pair[ 0 ];

        this.$label = this.field.$label;
        this.$label.empty();

        // Hide field input area if for group
        if ( !this.isIndividual ) {
            this.field.getField().toggle( false );
        }

        // Build the label
        const areCoordsEnabled = this.panel.map.isFeatureBitSet( MapFlags.ShowCoordinates );
        // Coordinates
        if ( areCoordsEnabled ) {
            this.$coordLabel = $( '<b>' ).text( this.panel.map.getCoordLabel( this.apiInstance ) ).appendTo( this.$label );
        }
        // Marker label
        this.$labelText = $( '<span>' ).appendTo( this.$label );
        if ( this.slots.label ) {
            const groupName = this.markerGroup.group.name;
            let labelText = this.slots.label;
            if ( labelText.indexOf( groupName ) === 0 ) {
                labelText = labelText.slice( groupName.length ).trim().replace( /(^\(|\)$)/g, '' );
                if ( labelText.length <= 2 ) {
                    labelText = this.slots.label;
                }
            }
            this.$labelText.html( labelText );
        }

        if ( Util.isBitSet( this.markerGroup.group.flags, MarkerGroupFlags.IsNumberedInChecklists ) ) {
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
};


module.exports = CollectiblesPanel;
