/** @typedef {import( './filters.js' )} MarkerFilteringPanel */
const LegendTabber = require( './tabber.js' ),
    { CRSOrigin, MarkerGroupFlags, MapFlags } = require( '../enums.js' ),
    Util = require( '../util.js' );


class CollectiblesPanel extends LegendTabber.Tab {
    /**
     * @param {LegendTabber} tabber
     */
    constructor( tabber ) {
        super( tabber, mw.msg( 'datamap-legend-tab-checklist' ), [ 'datamap-container-collectibles' ] );

        /**
         * @type {Record<string, Section>}
         */
        this.sections = {};
        /**
         * Whether badge updates are disabled.
         *
         * @type {boolean}
         */
        this.suppressBadgeUpdates = true;

        // Register event handlers
        this.map.on( 'markerDismissChange', () => this.updateGroupBadges(), this );
        this.map.on( 'markerDismissChange', this.onDismissalChange, this );
        this.map.on( 'markerReady', this.pushMarker, this );
        this.map.on( 'chunkStreamingDone', this.sort, this );
        this.map.on( 'chunkStreamingDone', () => ( this.suppressBadgeUpdates = false ), this );
        this.map.on( 'chunkStreamingDone', this.updateGroupBadges, this );

        // Call updaters now to bring the main panel in sync
        this.updateGroupBadges( true );

        // Insert an introduction paragraph
        this.$content.append( mw.msg( 'datamap-checklist-prelude' ) );

        // Import existing markers if any have been loaded
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[ groupName ];
            if ( Util.Groups.getCollectibleType( group ) ) {
                for ( const leafletMarker of ( this.map.layerManager.byLayer[ groupName ] || [] ) ) {
                    this.pushMarker( leafletMarker );
                }
            }
        }
        this.sort();

        // Initialise marker group views
        // eslint-disable-next-line es-x/no-object-entries
        this.includeGroups( Object.entries( this.map.config.groups ).filter( x => Util.Groups.getCollectibleType( x[ 1 ] ) )
            .map( x => x[ 0 ] ) );
    }


    /**
     * Sets up sections for marker groups.
     *
     * @param {string[]} ids
     */
    includeGroups( ids ) {
        for ( const id of ids ) {
            const group = this.map.config.groups[ id ];
            this.sections[ id ] = new CollectiblesPanel.Section( this, group );
            this.sections[ id ].$element.appendTo( this.$content );
        }
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    pushMarker( leafletMarker ) {
        if ( Util.Groups.getCollectibleType( this.map.config.groups[ leafletMarker.attachedLayers[ 0 ] ] ) ) {
            this.sections[ leafletMarker.attachedLayers[ 0 ] ].push( leafletMarker );
        }
    }


    /**
     * Sorts sections.
     */
    sort() {
        for ( const section of Object.values( this.sections ) ) {
            section.sort();
        }

        if ( this.map.isFeatureBitSet( MapFlags.SortChecklistsByAmount ) ) {
            for ( const section of Object.values( this.sections ).sort( ( a, b ) => b.markers.length - a.markers.length ) ) {
                this.$content.append( section.$content );
            }
        }
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    onDismissalChange( leafletMarker ) {
        this.sections[ leafletMarker.attachedLayers[ 0 ] ].replicateMarkerState( leafletMarker );
    }


    /**
     * Updates badges in the filtering panel with current collected / available counts.
     *
     * @param {boolean} [force]
     */
    updateGroupBadges( force ) {
        if ( !force && this.suppressBadgeUpdates ) {
            return;
        }

        for ( const groupId in this.sections ) {
            const markers = this.map.layerManager.byLayer[ groupId ],
                filterEntry = /** @type {MarkerFilteringPanel} */ ( this.map.filtersPanel ).groupToggles[ groupId ];
            // Check if the layer is registered in the visibility manager, and if a group toggle is ready
            if ( markers && filterEntry ) {
                const count = markers.filter( x => x.options.dismissed ).length,
                    mode = Util.Groups.getCollectibleType( this.map.config.groups[ groupId ] );
                filterEntry.setBadge( ( mode === MarkerGroupFlags.Collectible_Individual ? `${count} / ${markers.length}` : '' )
                    + ( count > 0 && count === markers.length ? '✓' : '' ) );
            }
        }
    }
}


class Section {
    /**
     * @param {CollectiblesPanel} panel
     * @param {DataMaps.Configuration.MarkerGroup} group
     */
    constructor( panel, group ) {
        /**
         * @type {CollectiblesPanel}
         */
        this.panel = panel;
        /**
         * @type {DataMaps.Configuration.MarkerGroup}
         */
        this.group = group;
        /**
         * @type {LeafletModule.AnyMarker[]}
         */
        this.markers = [];
        /**
         * @readonly
         * @type {boolean}
         */
        this.isIndividual = Util.Groups.getCollectibleType( group ) === MarkerGroupFlags.Collectible_Individual;
        /**
         * @type {jQuery?}
         */
        this.$icon = null;
        if ( 'legendIcon' in group ) {
            this.$icon = Util.Groups.createIconElement( group );
        } else if ( 'fillColor' in group ) {
            this.$icon = Util.Groups.createCircleElement( group );
        }
        /**
         * @type {OO.ui.Widget}
         */
        this.container = new OO.ui.Widget( {
            classes: [ 'datamap-collectible-group-markers' ]
        } );
        /**
         * @type {OO.ui.CheckboxInputWidget}
         */
        this.checkbox = new OO.ui.CheckboxInputWidget( {
            selected: false
        } );
        /**
         * @type {jQuery}
         */
        this.$content = new OO.ui.PanelLayout( {
            framed: true,
            expanded: false,
            content: [
                new OO.ui.PanelLayout( {
                    padded: true,
                    expanded: false,
                    classes: [ 'datamap-collectible-group-header' ],
                    content: [
                        this.checkbox,
                        this.$icon || '',
                        new OO.ui.LabelWidget( {
                            label: group.name
                        } )
                    ]
                } ),
                this.container
            ]
        } ).$element;

        this.checkbox.on( 'change', () => this.toggleAll( this.checkbox.isSelected() ) );
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
            case CRSOrigin.TopLeft:
                sortKey = ( a, b ) => {
                    if ( a.apiInstance[ 0 ] === b.apiInstance[ 0 ] ) {
                        return a.apiInstance[ 1 ] > b.apiInstance[ 1 ];
                    }
                    return a.apiInstance[ 0 ] > b.apiInstance[ 0 ];
                };
                break;
            case CRSOrigin.BottomLeft:
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
}


CollectiblesPanel.Section = Section;


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
