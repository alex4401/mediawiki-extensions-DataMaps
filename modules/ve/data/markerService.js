/** @typedef {import( '../editor.js' )} MapVisualEditor */
/** @typedef {import( '../../../schemas/src/Marker.js' ).Marker} Schema_Marker */
const { DataMap } = require( 'ext.datamaps.core' ),
    { getOrDefault } = require( '../util.js' ),
    SettingsDataService = require( './settingsService.js' );


module.exports = class MarkerDataService {
    /**
     * @param {MapVisualEditor} editor
     */
    constructor( editor ) {
        /**
         * @private
         * @type {MapVisualEditor}
         */
        this._editor = editor;
        /**
         * @private
         * @type {InstanceType<DataMap>}
         */
        this._map = this._editor.map;
        /**
         * @private
         * @type {SettingsDataService}
         */
        this._settingsService = this._editor.getService( SettingsDataService );
    }


    getData() {
        return getOrDefault( this._editor.getData(), 'markers', {} );
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @return {Schema_Marker}
     */
    getLeafletMarkerSource( leafletMarker ) {
        return leafletMarker.apiInstance[ 2 ].raw;
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @return {string}
     */
    getLeafletMarkerAssociationString( leafletMarker ) {
        return leafletMarker.attachedLayers.join( ' ' );
    }


    /**
     * @param {Schema_Marker} source
     */
    normaliseCoordinates( source ) {
        const isXY = this._settingsService.prefersXyCoordinates();
        if ( isXY && 'lat' in source && 'lon' in source ) {
            this.setSourceCoordinates( source, source.lat, source.lon );
        } else if ( !isXY && 'x' in source && 'y' in source ) {
            this.setSourceCoordinates( source, source.x, source.y );
        }
    }


    /**
     * @param {Schema_Marker} source
     * @param {number} lat
     * @param {number} lon
     */
    setSourceCoordinates( source, lat, lon ) {
        const
            prefersXY = this._settingsService.prefersXyCoordinates(),
            xProperty = prefersXY ? 'x' : 'lon',
            yProperty = prefersXY ? 'y' : 'lat';
        if ( this._settingsService.prefersYCoordinateFirst() ) {
            source[ yProperty ] = lat;
            source[ xProperty ] = lon;
        } else {
            source[ xProperty ] = lon;
            source[ yProperty ] = lat;
        }
    }


    /**
     * @param {Schema_Marker} source
     * @return {DataMaps.PointTupleRepr}
     */
    getSourceCoordinates( source ) {
        if ( 'lat' in source && 'lon' in source ) {
            return [ source.lat, source.lon ];
        } else if ( 'x' in source && 'y' in source ) {
            return [ source.y, source.x ];
        }

        throw new Error( 'Invalid marker data: neither lat/lon nor x/y is present' );
    }


    /**
     * @param {string[]} associations
     * @param {Schema_Marker} source
     */
    pushToStore( associations, source ) {
        // Push to the source marker store if not already in
        const store = this.getData(),
            ownership = associations.join( ' ' );
        if ( !( ownership in store ) ) {
            store[ ownership ] = [];
        }
        if ( store[ ownership ].indexOf( source ) < 0 ) {
            store[ ownership ].push( source );
        }
    }


    /**
     * @param {string[]} associations
     * @param {Schema_Marker} source
     */
    removeFromStore( associations, source ) {
        const ownership = associations.join( ' ' );
        if ( !( ownership in this.getData() ) ) {
            throw new Error( `Marker collection contains no association list for ${ownership}` );
        }
        const collection = this.getData()[ ownership ],
            index = collection.indexOf( source );
        if ( index < 0 ) {
            throw new Error( `Requested marker deletion, but marker not in the association list for ${ownership}` );
        }
        collection.splice( index, 1 );
    }


    /**
     * @param {string[]} associations
     * @param {Schema_Marker} source
     * @return {LeafletModule.AnyMarker}
     */
    create( associations, source ) {
        this.pushToStore( associations, source );
        // Create visual component
        const result = this._editor.map.createMarker(
            associations,
            this.getSourceCoordinates( source ),
            {
                editor: this._editor,
                raw: source
            },
            null
        );
        this.syncRuntime( result );
        return result;
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    remove( leafletMarker ) {
        // Close the popup associated with this marker if it's open
        leafletMarker.closePopup();
        // Update the data store
        const source = this.getLeafletMarkerSource( leafletMarker );
        this.removeFromStore( leafletMarker.attachedLayers, source );
        // Remove the marker from Leaflet
        this._map.layerManager.removeMember( leafletMarker );
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    syncRuntime( leafletMarker ) {
        const
            source = this.getLeafletMarkerSource( leafletMarker ),
            state = leafletMarker.apiInstance[ 2 ],
            coords = this.getSourceCoordinates( source );

        if ( leafletMarker.apiInstance[ 0 ] !== coords[ 0 ] || leafletMarker.apiInstance[ 1 ] !== coords[ 1 ] ) {
            leafletMarker.setLatLng( this._editor.map.translatePoint( coords ) );
            leafletMarker.apiInstance[ 0 ] = coords[ 0 ];
            leafletMarker.apiInstance[ 1 ] = coords[ 1 ];
        }

        state.label = source.name;
        state.desc = source.description;
        state.uid = source.id;
        state.imageName = source.image;
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @param {string} newGroup
     * @return {LeafletModule.AnyMarker}
     */
    moveToGroup( leafletMarker, newGroup ) {
        const newLayers = leafletMarker.attachedLayers.slice( 1 );
        newLayers.unshift( newGroup );
        return this.changeLayers( leafletMarker, newLayers );
    }


    /**
     * @param {LeafletModule.AnyMarker} leafletMarker
     * @param {string[]} newLayers
     * @return {LeafletModule.AnyMarker}
     */
    changeLayers( leafletMarker, newLayers ) {
        // Move the marker between data stores
        const oldOwnership = leafletMarker.attachedLayers,
            source = this.getLeafletMarkerSource( leafletMarker );
        this.removeFromStore( oldOwnership, source );
        this.pushToStore( newLayers, source );

        const result = this._map.createMarkerFromApiInstance( newLayers, leafletMarker.apiInstance,
            leafletMarker.assignedProperties );
        leafletMarker.remove();
        return result;
    }
};
