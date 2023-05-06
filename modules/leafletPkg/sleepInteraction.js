const Leaflet = /** @type {LeafletModule} */ ( require( '../vendor/leaflet/leaflet.js' ) ),
    DomEvent = Leaflet.DomEvent;


module.exports = Leaflet.Handler.extend( {
    addHooks() {
        
    },


    removeHooks() {

    },


    /**
     * @private
     * @param {boolean} enabled
     */
    _setHandlerState( enabled ) {
        for ( const handler of [
            'scrollWheelZoom',
            'dragging',
            'touchZoom',
            'tap'
        ] ) {
            if ( this._map[ handler ] ) {
                this._map[ handler ][ enabled ? 'enable' : 'disable' ]();
            }
        }
    },


    /**
     * @private
     * @param {'sleep'|'wake'} type
     * @param {boolean} enabled
     */
    _setListeners( type, enabled ) {
        const method = enabled ? 'on' : 'off';
        if ( type === 'sleep' ) {
            this._map[ method ]( 'mouseover', this._onMouseOver, this );
            this._map[ method ]( 'click', this._onMouseClick, this );
        } else {
            this._map[ method ]( 'mouseout', this._onMouseOut, this );
        }
    },


    _onMouseOver() {

    }


    
} );
