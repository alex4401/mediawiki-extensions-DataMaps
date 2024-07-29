/** @typedef {import( './DataMap.js' )} DataMap */
const
    { MapControl } = require( './controls.js' ),
    { getNonNull } = require( './Util.js' );


class DebugControl extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'debug' );
    }


    _build() {
        getNonNull( this.map.viewport ).getLeafletMap().on(
            'mousemove zoom',
            this._updateText,
            this
        );
    }

    _updateText() {
        const leaflet = getNonNull( this.map.viewport ).getLeafletMap(),
            bounds = this.map.getCurrentContentBounds();
        this.element.innerHTML = [
            `zoom: ${leaflet.getZoom()}`,
            `north-east: (${bounds._northEast.lat}, ${bounds._northEast.lng})`,
            `south-west: (${bounds._southWest.lat}, ${bounds._southWest.lng})`,
            `scale: (${this.map.crs.scaleX}, ${this.map.crs.scaleY})`,
        ].join( '<br/>' );
    }
}


module.exports = DebugControl;
