/** @typedef {import( './map.js' )} DataMap */


module.exports = class MarkerLayerManager {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        /**
         * Owning map.
         *
         * @type {DataMap}
         */
        this.map = map;
        /**
         * Collection of all bound markers.
         *
         * @type {LeafletModule.AnyMarker[]}
         */
        this.markers = [];
        /**
         * Map of markers by layer.
         *
         * @type {Record<string, LeafletModule.AnyMarker[]>}
         */
        this.byLayer = {};
        /**
         * Permitted layer names
         *
         * @private
         * @type {Set<string>}
         */
        this._includeMaskHi = new Set();
        /**
         * Required layer names (that must be present on a marker for it to be displayed)
         *
         * @private
         * @type {Set<string>}
         */
        this._includeMaskLo = new Set();
        /**
         * Excluded layer names
         *
         * @private
         * @type {Set<string>}
         */
        this._excludeMask = new Set();
        /**
         * Parametrised requirements
         *
         * @private
         * @type {Record<string, string>}
         */
        this._includeMaskPr = {};
        /**
         * Computed visibility cache.
         *
         * @private
         * @type {Record<string, boolean>}
         */
        this._computeCache = {};
        /**
         * @private
         * @type {boolean}
         */
        this._doNotUpdate = false;

        this.map.on( 'markerVisibilityUpdate', () => ( this.map.leaflet._haveLayersMutated = false ) );
    }


    /**
     * Resets internal visibility computation cache. This must be called whenever any parameters are modified.
     */
    clearCache() {
        this._computeCache = {};
    }


    /**
     * @param {string} layerName
     */
    register( layerName ) {
        if ( !this.byLayer[ layerName ] ) {
            this.byLayer[ layerName ] = [];
        }
    }


    /**
     * @param {string[]} layers
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    addMember( layers, leafletMarker ) {
        leafletMarker.attachedLayers = layers;
        for ( const layer of layers ) {
            this.byLayer[ layer ].push( leafletMarker );
        }
        this.markers.push( leafletMarker );
        this.updateMember( leafletMarker );
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @param {string} layer
     */
    addMarkerToLayer( leafletMarker, layer ) {
        leafletMarker.attachedLayers.push( layer );
        this.byLayer[ layer ].push( leafletMarker );
        this.updateMember( leafletMarker );
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    removeMember( leafletMarker ) {
        this.map.leaflet.removeLayer( leafletMarker );
        for ( const layer of leafletMarker.attachedLayers ) {
            delete this.byLayer[ layer ][ this.byLayer[ layer ].indexOf( leafletMarker ) ];
        }
        delete this.markers[ this.markers.indexOf( leafletMarker ) ];
        leafletMarker.attachedLayers = [];
    }


    /**
     * @param {string[]} layers
     * @return {boolean}
     */
    shouldBeVisible( layers ) {
        // If requirement mask is not empty, and there is a layer inside the list does not have, return invisible
        if ( this._includeMaskHi.size > 0 && !( () => {
            let result = true;
            for ( const name of this._includeMaskHi ) {
                result = result && layers.indexOf( name ) > 0;
            }
            return result;
        } )() ) {
            return false;
        }

        // If inclusion mask is not empty, and there is no overlap between it and queried layers, return invisible
        if ( this._includeMaskLo.size > 0 && !layers.some( name => this._includeMaskLo.has( name ) ) ) {
            return false;
        }

        // If exclusion mask is not empty, and there is overlap between it and queried layers, return invisible
        if ( this._excludeMask.size > 0 && layers.some( name => this._excludeMask.has( name ) ) ) {
            return false;
        }

        // Compare against the property mask: if (and only if) there's a sub-layer with a differing value, return invisible
        for ( const property in this._includeMaskPr ) {
            // Check if this property is specified in the layers list
            if ( layers.some( name => name.indexOf( property + ':' ) >= 0 ) ) {
                // Check if the value is matched
                if ( layers.indexOf( `${property}:${this._includeMaskPr[ property ]}` ) < 0 ) {
                    return false;
                }
            }
        }

        return true;
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @param {boolean} isInternalCall
     * @fires DataMap#markerVisibilityUpdate
     * @return {void}
     */
    updateMember( leafletMarker, isInternalCall = false ) {
        // Exit early if updates are disabled
        if ( this._doNotUpdate ) {
            return;
        }
        // Get marker layers
        const layers = leafletMarker.attachedLayers;
        // Request new visibility state from cache, or compute it if missed
        const cacheKey = layers.join( ' ' );
        let shouldBeVisible = this._computeCache[ cacheKey ];
        if ( shouldBeVisible === undefined ) {
            shouldBeVisible = this.shouldBeVisible( layers );
            this._computeCache[ cacheKey ] = shouldBeVisible;
        }
        // Add to Leaflet map if true, remove if false
        this.map.leaflet._haveLayersMutated = false;
        if ( shouldBeVisible ) {
            this.map.leaflet.addLayer( leafletMarker );
        } else {
            this.map.leaflet.removeLayer( leafletMarker );
        }

        // Notify other components of the visibility change if not an internal call, and there has been a recorded
        // ownership change.
        if ( !isInternalCall && this.map.leaflet._haveLayersMutated ) {
            this.map.fire( 'markerVisibilityUpdate' );
        }
    }


    /**
     * @param {string?} [layerName]
     * @fires DataMap#markerVisibilityUpdate
     */
    updateMembers( layerName ) {
        // Exit if Leaflet map is not initialised yet, updates are disabled, or the layer has not been registered
        if ( !this.map.leaflet || this._doNotUpdate || ( layerName && !this.byLayer[ layerName ] ) ) {
            return;
        }

        // Run an update on every member of the layer
        for ( const m of ( layerName ? this.byLayer[ layerName ] : this.markers ) ) {
            this.updateMember( m, true );
        }

        // Notify other components of the visibility change if there has been a recorded ownership change
        if ( this.map.leaflet._haveLayersMutated ) {
            this.map.fire( 'markerVisibilityUpdate' );
        }
    }


    /**
     * Sets a layer as *absolutely* required for a marker to be displayed. This updates ALL markers.
     *
     * @param {string} layerName
     * @param {boolean} state
     */
    setRequirement( layerName, state ) {
        this._includeMaskHi[ state ? 'add' : 'delete' ]( layerName );
        this.clearCache();
        this.updateMembers();
    }


    /**
     * Sets a layer as *absolutely* required for a marker to be displayed. This updates ALL markers.
     *
     * @param {string} propertyName
     * @param {string} value
     */
    setOptionalPropertyRequirement( propertyName, value ) {
        if ( value === null && this._includeMaskPr[ propertyName ] ) {
            delete this._includeMaskPr[ propertyName ];
        } else if ( value !== null ) {
            this._includeMaskPr[ propertyName ] = value;
        }
        this.clearCache();
        this.updateMembers();
    }


    /**
     * Sets a layer as required for a marker to be displayed. This updates ALL markers.
     *
     * @param {string} layerName
     * @param {boolean} state
     */
    setInclusion( layerName, state ) {
        this._includeMaskLo[ state ? 'add' : 'delete' ]( layerName );
        this.clearCache();
        this.updateMembers();
    }


    /**
     * Sets a layer as preventing marker display. This updates only markers within the layer.
     *
     * @param {string} layerName
     * @param {boolean} state
     */
    setExclusion( layerName, state ) {
        this._excludeMask[ state ? 'add' : 'delete' ]( layerName );
        this.clearCache();
        this.updateMembers( layerName );
    }

    /**
     * @param {boolean} state
     */
    setDeferVisibilityUpdates( state ) {
        if ( !state && this._doNotUpdate !== state ) {
            // Updates are being enabled back on, force a visibility update
            this._doNotUpdate = state;
            this.updateMembers();
        }
        this._doNotUpdate = state;
    }


    /**
     * Destroys ALL markers in a layer from the whole map (all layers). The layer itself is not deregistered.
     *
     * Expensive if there are markers in a lot of layers: each of those layers' members will be scanned.
     *
     * @param {string} layerName Layer to purge.
     */
    nuke( layerName ) {
        const toPurge = new Set();
        for ( const leafletMarker of this.byLayer[ layerName ] ) {
            // Remove the marker from map
            if ( leafletMarker._map ) {
                this.map.leaflet.removeLayer( leafletMarker );
            }
            // Remember other layers this marker is in, so we can clean them up as well
            for ( const other of leafletMarker.attachedLayers ) {
                if ( other !== layerName ) {
                    toPurge.add( other );
                }
            }
        }

        // Clean up other layer lists
        for ( const other of toPurge ) {
            this.byLayer[ other ] = this.byLayer[ other ].filter( x => x.attachedLayers.indexOf( other ) >= 0 );
        }
    }


    /**
     * Removes a layer list. This does not destroy the markers or tamper with any references. You must resolve that before
     * calling this method.
     *
     * @param {string} layerName Layer to remove.
     */
    deregister( layerName ) {
        delete this.byLayer[ layerName ];
    }
};
