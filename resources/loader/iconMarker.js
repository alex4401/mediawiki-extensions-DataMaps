const DISMISSED_MARKER_OPACITY = 0.4;


module.exports = L.Marker.extend( {
	options: {
        dismissed: false
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
			DomUtil.setOpacity( this._icon, opacity );
		}
	}
} );