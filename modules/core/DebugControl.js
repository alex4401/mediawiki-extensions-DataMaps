/** @typedef {import( './DataMap.js' )} DataMap */
const
    { MapControl } = require( './controls.js' ),
    { getNonNull, getLeaflet } = require( './Util.js' );


class DebugControl extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'debug' );

        /**
         * @private
         * @type {?LeafletModule.Rectangle}
         */
        this._rect = null;
    }


    _build() {
        this._updateBoundsRect();
        getNonNull( this.map.viewport ).getLeafletMap().on(
            'mousemove zoom',
            this._updateText,
            this
        );
        for ( const event of [
            'backgroundChange',
            'markerVisibilityUpdate',
            'chunkStreamed',
        ] ) {
            this.map.on(
                event,
                this._updateBoundsRect,
                this
            );
        }
    }


    _updateText() {
        const leaflet = getNonNull( this.map.viewport ).getLeafletMap(),
            bounds = this.map.getCurrentContentBounds(),
            viewport = leaflet.getBounds();
        this.element.innerHTML = [
            `zoom: ${leaflet.getZoom()}`,
            `content NE: (${bounds._northEast.lat}, ${bounds._northEast.lng})`,
            `content SW: (${bounds._southWest.lat}, ${bounds._southWest.lng})`,
            `viewport NE: (${viewport._northEast.lat}, ${viewport._northEast.lng})`,
            `viewport SW: (${viewport._southWest.lat}, ${viewport._southWest.lng})`,
            `offset width: ${this.map.getMapOffsetWidth()}`,
            `coordinate scale: (${this.map.crs.scaleX}, ${this.map.crs.scaleY})`,
            `marker scale: v${leaflet.options.vecMarkerScale}, i${leaflet.options.iconMarkerScale}`
        ].join( '<br/>' );
    }


    _updateBoundsRect() {
        if ( !this._rect ) {
            const Leaflet = getLeaflet();
            this._rect = new Leaflet.Rectangle(
                [ [ 0, 0 ], [ 0, 0 ] ],
                {
                    color: '#f0f',
                    weight: 1,
                    dashArray: '8',
                    fill: false,
                }
            );
            this._rect.addTo( getNonNull( this.map.viewport ).getLeafletMap() )
        }

        this._rect.setBounds( this.map.getCurrentContentBounds() );
    }
}


module.exports = DebugControl;
