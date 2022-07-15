const MAX_RADIUS_TO_GROW_MORE = 4;


module.exports = L.CircleMarker.extend( {
	options: {
		baseRadius: 10
	},

	setRadius: function ( radius ) {
		this.options.baseRadius = this._radius = radius;
		return this.redraw();
	},

    getDisplayScale: function () {
        if ( this._map.options.shouldExpandZoomInvEx && this.options.baseRadius <= MAX_RADIUS_TO_GROW_MORE ) {
            return this._map.options.markerScaleI + ( 1 - this._map.options.markerScaleA )
                * ( this.options.expandZoomInvEx || this._map.options.expandZoomInvEx );
        }
        return this._map.options.markerScaleI;
    },

	_updatePath: function () {
        this._radius = this.options.baseRadius * this.getDisplayScale();
        // Super behaviour
		this._renderer._updateCircle( this );
	}
} );