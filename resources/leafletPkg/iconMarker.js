const Leaflet = require( '../vendor/leaflet/leaflet.js' ),
	DISMISSED_MARKER_OPACITY = 0.4;


module.exports = Leaflet.Marker.extend( {
	options: {
        dismissed: false
	},

	_initIcon: function () {
		Leaflet.Marker.prototype._initIcon.call( this );
		if ( this.options.dismissed ) {
			this._updateOpacity();
		}
	},

	update: function () {
		if ( this._icon && this._map ) {
			const size = Leaflet.point( this.options.icon.options.iconSize )._multiplyBy( this._map.options.markerScaleA );
			const anchor = size.divideBy( 2 );

			this._icon.style.marginLeft = (-anchor.x) + 'px';
			this._icon.style.marginTop  = (-anchor.y) + 'px';
			this._icon.style.width  = this.options.icon.options.iconSize[0] * this._map.options.markerScaleA + 'px';
			this._icon.style.height = this.options.icon.options.iconSize[1] * this._map.options.markerScaleA + 'px';
		}

		return Leaflet.Marker.prototype.update.call( this );
	},

	setDismissed: function ( state ) {
		this.options.dismissed = state;
		this.opacityMult = state ? DISMISSED_MARKER_OPACITY : 1;
		if ( this._map ) {
			this._updateOpacity();
		}
		return this;
	}
} );