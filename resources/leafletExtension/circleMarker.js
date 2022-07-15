const Common = require( './common.js' );
const MAX_RADIUS_TO_GROW_MORE = 4;


module.exports = L.CircleMarker.extend( {
	options: {
		baseRadius: 10,
		baseOpacity: 1,
		baseFillOpacity: 1,
		dimmed: false
	},

	setDimmed: function ( state ) {
		this.options.dimmed = state;
		return this.redraw();
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
		// Dimming
		this.options.opacity = this.options.baseOpacity;
		this.options.fillOpacity = this.options.baseFillOpacity;
		if ( this.options.dimmed ) {
			this.options.opacity *= Common.DIM_OPACITY_MUL;
			this.options.fillOpacity *= Common.DIM_OPACITY_MUL;
		}
		// Restore pre-highlight border colour
		if ( !this._map.options.isDimming && this._realColor != null ) {
			this.options.color = this._realColor;
			this._realColor = null;
		}
		// Override border colour if highlighting
		if ( this._map.options.isDimming && !this.options.dimmed ) {
			this._realColor = this.options.color;
			this.options.color = Common.DIM_BORDER_COLOUR;
		}
        // Super behaviour
		this._renderer._updateCircle( this );
	}
} );