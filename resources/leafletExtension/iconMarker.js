const Common = require('./common.js');


module.exports = L.Marker.extend( {
	options: {
        dismissed: false,
		dimmed: false
	},

	_initIcon: function () {
		L.Marker.prototype._initIcon.call( this );
		if ( this.options.dismissed ) {
			this._updateOpacity();
		}
	},

	setDimmed: function ( state ) {
		this.options.dimmed = state;
		if ( this._map ) {
			this._updateOpacity();
		}
		return this;
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
		if ( this._icon ) {
			// Include dismissal
			var opacity = this.options.opacity;
			if ( this.options.dismissed ) {
				opacity *= Common.DISMISS_OPACITY_MUL;
			}
			// Include dim
			if ( this.options.dimmed ) {
				opacity *= Common.DIM_OPACITY_MUL;
			}
			// Super behaviour
			L.DomUtil.setOpacity( this._icon, opacity );
		}
	}
} );