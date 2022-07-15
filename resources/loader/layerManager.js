function MarkerLayerManager( map ) {
    this.map = map;
    this.markers = [];
    this.byLayer = {};
    this.includeMask = new Set();
    this.excludeMask = new Set();
    this.clearCache();
}


MarkerLayerManager.prototype.clearCache = function () {
    this.computeCache = {};
};


MarkerLayerManager.prototype.register = function ( layerName ) {
    if ( !this.byLayer[layerName] ) {
        this.byLayer[layerName] = [];
    }
};


MarkerLayerManager.prototype.addMember = function ( type, leafletMarker ) {
    leafletMarker.arkAttachedLayers = type.split(' ');
    leafletMarker.arkAttachedLayers.forEach( layer => this.byLayer[ layer ].push( leafletMarker ) );
    this.markers.push( leafletMarker );
    this.updateMember( leafletMarker );
};


MarkerLayerManager.prototype.removeMember = function ( leafletMarker ) {
    this.map.leaflet.removeLayer( leafletMarker );
    leafletMarker.arkAttachedLayers.forEach( layer => {
        delete this.byLayer[layer][this.byLayer[layer].indexOf( leafletMarker )];
    } );
    delete this.markers[this.markers.indexOf( leafletMarker )];
    leafletMarker.arkAttachedLayers = null;
};


MarkerLayerManager.prototype.shouldBeVisible = function ( layers ) {
    // If inclusion mask is not empty, and there is no overlap between it and queried layers, return invisible
    if ( this.includeMask.size > 0 && !layers.some( name => this.includeMask.has( name ) ) ) {
        return false;
    }

    // If exclusion mask is not empty, and there is overlap between it and queried layers, return invisible
    if ( this.excludeMask.size > 0 && layers.some( name => this.excludeMask.has( name ) ) ) {
        return false;
    }

    return true;
};


MarkerLayerManager.prototype.updateMember = function ( leafletMarker ) {
    const layers = leafletMarker.arkAttachedLayers;
    // Request new visibility state from cache, or compute it if missed
    let shouldBeVisible = this.computeCache[layers];
    if ( shouldBeVisible == null ) {
        shouldBeVisible = this.shouldBeVisible( layers );
        this.computeCache[layers] = shouldBeVisible;
    }
    // Add to Leaflet map if true, remove if false
    if ( shouldBeVisible )
        this.map.leaflet.addLayer( leafletMarker )
    else
        this.map.leaflet.removeLayer( leafletMarker );
};


MarkerLayerManager.prototype.updateMembers = function ( layerName ) {
    ( layerName ? this.byLayer[layerName] : this.markers ).forEach( m => this.updateMember( m ) );
};


/*
 * Sets a layer as required for a marker to be displayed. This updates ALL markers.
 */
MarkerLayerManager.prototype.setInclusion = function ( layerName, state ) {
    if ( state )
        this.includeMask.add( layerName );
    else
        this.includeMask.delete( layerName );
    this.clearCache();
    this.updateMembers();
};


/*
 * Sets a layer as preventing marker display. This updates only markers within the layer.
 */
MarkerLayerManager.prototype.setExclusion = function ( layerName, state ) {
    if ( state )
        this.excludeMask.add( layerName );
    else
        this.excludeMask.delete( layerName );
    this.clearCache();
    this.updateMembers( layerName );
};


module.exports = MarkerLayerManager;