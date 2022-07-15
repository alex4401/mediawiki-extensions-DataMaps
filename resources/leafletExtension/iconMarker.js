const DISMISSED_MARKER_OPACITY = 0.4;


module.exports = L.Marker.extend( {
	options: {
        dismissed: false
	},

	_initIcon: function () {
		L.Marker.prototype._initIcon.call( this );
		if ( this.options.dismissed ) {
			this._updateOpacity();
		}
	},

	update: function () {
		if ( this._icon && this._map ) {
			this._icon.style.width  = this.options.icon.options.iconSize[0] * this._map.options.markerScaleA + 'px';
			this._icon.style.height = this.options.icon.options.iconSize[1] * this._map.options.markerScaleA + 'px';
		}
		return L.Marker.prototype.update.call( this );
	},

	setDismissed: function ( state ) {
		this.options.dismissed = state;
		if ( this._map ) {
			this._updateOpacity();
		}
		return this;
	},

	_updateOpacity: function () {
		var opacity = this.options.opacity;
        if ( this.options.dismissed ) {
            opacity *= DISMISSED_MARKER_OPACITY;
        }

		if ( this._icon ) {
			L.DomUtil.setOpacity( this._icon, opacity );
		}
	}
} );