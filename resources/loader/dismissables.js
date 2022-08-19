class DismissableMarkersGroup {
    constructor( panel, group ) {
        this.panel = panel;
        this.map = this.panel.map;
    }
}


class DismissableMarkersLegend {
    constructor( legend ) {
        this.legend = legend;
        this.map = this.legend.map;
        // Root DOM element
        this.$root = this.legend.addTab( mw.msg( 'datamap-legend-tab-checklist' ) ).$element;
        //
        this.groups = {};

        // Register event handlers
        this.map.on( 'markerDismissChange', this.onDismissalChange, this );
        this.map.on( 'markerDismissChange', this.updateGroupBadges, this );
        this.map.on( 'markerReady', this.pushMarker, this );
        this.map.on( 'streamingDone', this.updateGroupBadges, this );

        // Prepare the panel
        this._initialisePanel();

        // Call updaters now to bring the panel in sync
        this.updateGroupBadges();
    }


    registerGroup( groupName, group ) {
        this.groups[groupName] = new DismissableMarkersGroup( this, group );
    }


    _initialisePanel() {
        for ( const groupName in this.map.config.groups ) {
            const group = this.map.config.groups[groupName];
            if ( group.canDismiss ) {
                this.registerGroup( groupName, group );
            }
        }
    }


    pushMarker() {
    }


    onDismissalChange() {

    }


    updateGroupBadges() {
        for ( const groupId in this.map.config.groups ) {
            const group = this.map.config.groups[groupId];
            if ( group.canDismiss && this.map.markerLegend.groupToggles[groupId] ) {
                const markers = this.map.layerManager.byLayer[groupId];
                const count = markers.filter( x => x.options.dismissed ).length;
                this.map.markerLegend.groupToggles[groupId].setBadge( `${count} / ${markers.length}` );
            }
        }
    }
};


module.exports = DismissableMarkersLegend;