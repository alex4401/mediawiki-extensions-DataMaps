/** @typedef {import( './DataMap.js' )} DataMap */
const
    EventEmitter = require( './EventEmitter.js' ),
    Util = require( './Util.js' );


/**
 * @extends EventEmitter<DataMaps.EventHandling.MapListenerSignatures>
 */
class Background extends EventEmitter {
    /**
     * @param {DataMap} map
     * @param {DataMaps.Configuration.Background} config
     * @param {number} index
     */
    constructor( map, config, index ) {
        super();

        /**
         * Owning map.
         *
         * @type {DataMap}
         */
        this.map = map;

        /**
         * Associated marker category.
         *
         * @type {string}
         */
        this.categoryId = config.layer || `${index}`;

        /**
         * Image bounds.
         *
         * @type {LeafletModule.LatLngBoundsTuple}
         */
        // TODO: backend should perform this fallback
        this.bounds = config.at || this.map.config.crs;

        /**
         * Image URL.
         *
         * @type {string?}
         */
        this.image = config.image || null;

        /**
         * Whether the browser should scale this image in pixel-art mode.
         *
         * @type {boolean}
         */
        this.isPixelated = config.pixelated || false;

        /**
         * If true, 0.51px will be added to the image in the viewport to alleviate gaps.
         *
         * @private
         * @type {boolean}
         */
        this._needsFractionalSizing = config.aa || false;

        /**
         * Attached overlays.
         *
         * @private
         * @type {DataMaps.Configuration.BackgroundOverlay[]?}
         */
        this._overlayConfigs = config.overlays || null;
    }


    constructLayers() {
        const results = [];
        if ( this.image ) {
            results.push( this._constructMainLayer() );
        }
        if ( this._overlayConfigs ) {
            for ( const config of this._overlayConfigs ) {
                results.push( this._constructOverlay( config ) );
            }
        }
        return results;
    }


    /**
     * @private
     * @return {LeafletModule.ImageOverlay}
     */
    _constructMainLayer() {
        const Leaflet = Util.getLeaflet();
        return new Leaflet.ImageOverlay(
            Util.getNonNull( this.image ),
            this.map.crs.fromBox( this.bounds ),
            {
                className: this.isPixelated ? 'ext-datamaps-pixelated-image' : undefined,
                decoding: 'async',
                angle: this.map.crs.rotation * 180 / Math.PI,
                // Expand the DOM element's width and height by 0.51 pixels. This helps with gaps between tiles.
                antiAliasing: this._needsFractionalSizing ? 0.51 : 0
            }
        );
    }


    /**
     * @private
     * @param {DataMaps.Configuration.BackgroundOverlay} overlay
     * @return {LeafletModule.Rectangle|LeafletModule.Polyline|LeafletModule.ImageOverlay}
     */
    _constructOverlay( overlay ) {
        const Leaflet = Util.getLeaflet();
        let result;

        if ( overlay.image ) {
            // Construct an image
            result = new Leaflet.ImageOverlay( overlay.image, this.map.crs.fromBox( overlay.at ), {
                className: overlay.pixelated ? 'ext-datamaps-pixelated-image' : undefined,
                decoding: 'async',
                // Expand the DOM element's width and height by 0.51 pixels. This helps with gaps between tiles.
                antiAliasing: overlay.aa ? 0.51 : 0
            } );
        } else if ( overlay.path ) {
            // Construct a polyline
            result = new Leaflet.Polyline( overlay.path.map( p => this.map.crs.fromBox( p ) ), {
                color: overlay.colour || Leaflet.Path.prototype.options.color,
                weight: overlay.thickness || Leaflet.Path.prototype.options.weight
            } );
        } else {
            // Construct a rectangle
            result = new Leaflet.Rectangle( this.map.crs.fromBox( overlay.at ), {
                color: overlay.strokeColour || Leaflet.Path.prototype.options.color,
                fillColor: overlay.colour || Leaflet.Path.prototype.options.fillColor
            } );
        }

        // Bind name as tooltip
        if ( overlay.name ) {
            result.bindTooltip( overlay.name );
        }

        return result;
    }
}


module.exports = Background;
