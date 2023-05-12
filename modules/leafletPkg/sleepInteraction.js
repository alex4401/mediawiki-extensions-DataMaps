/**
 * Adaptation of Wikimedia's fork of CliffCloud's Leaflet.Sleep.
 */

const Leaflet = /** @type {LeafletModule} */ ( require( '../vendor/leaflet/leaflet.js' ) );


Leaflet.Map.mergeOptions( {
    sleep: true,
    sleepTime: 750,
    wakeTime: 750,
    hoverToWake: true,
    sleepOpacity: 0.7
} );


module.exports = Leaflet.Handler.extend( {
    addHooks() {
        this._enterTimeout = null;
        this._exitTimeout = null;
        this._sleepMap();
    },


    removeHooks() {
        if ( !this._map.scrollWheelZoom.enabled() ) {
            this._map.scrollWheelZoom.enable();
        }
        if ( this._map.tap && !this._map.tap.enabled() ) {
            this._map.touchZoom.enable();
            this._map.dragging.enable();
            this._map.tap.enable();
        }
        this._removeSleepingListeners();
        this._removeAwakeListeners();
    },


    _wakeMap() {
        this._stopWaiting();
        this._map.scrollWheelZoom.enable();
        this._map.dragging.enable();
        if ( this._map.tap ) {
            this._map.touchZoom.enable();
            this._map.tap.enable();
        }
        this._addAwakeListeners();
    },


    _sleepMap() {
        this._stopWaiting();
        this._map.scrollWheelZoom.disable();
        this._map.dragging.disable();

        if ( this._map.tap ) {
            this._map.touchZoom.disable();
            this._map.tap.disable();
        }

        this._addSleepingListeners();
    },


    _wakePending() {
        this._map.once( 'mousedown', this._wakeMap, this );
        if ( this._map.options.hoverToWake ) {
            this._map.once( 'mouseout', this._sleepMap, this );
            this._enterTimeout = setTimeout( () => {
                this._map.off( 'mouseout', this._sleepMap, this );
                this._wakeMap();
            }, this._map.options.wakeTime );
        }
    },

    _sleepPending() {
        this._map.once( 'mouseover', this._wakeMap, this );
        this._exitTimeout = setTimeout( () => {
            this._map.off( 'mouseover', this._wakeMap, this );
            this._sleepMap();
        }, this._map.options.sleepTime );
    },


    _addSleepingListeners() {
        this._map.once( 'mouseover', this._wakePending, this );
        this._map.once( 'click', this._wakeMap, this );
    },


    _addAwakeListeners() {
        this._map.once( 'mouseout', this._sleepPending, this );
    },


    _removeSleepingListeners() {
        if ( this._map.options.hoverToWake ) {
            this._map.off( 'mouseover', this._wakePending, this );
        }
        this._map.off( 'mousedown', this._wakeMap, this );
        this._map.off( 'click', this._wakeMap, this );
    },


    _removeAwakeListeners() {
        this._map.off( 'mouseout', this._sleepPending, this );
    },

    _stopWaiting: function () {
        this._removeSleepingListeners();
        this._removeAwakeListeners();
        if ( this._enterTimeout !== null ) {
            clearTimeout( this._enterTimeout );
            this._enterTimeout = null;
        }
        if ( this._exitTimeout !== null ) {
            clearTimeout( this._exitTimeout );
            this._exitTimeout = null;
        }
    }
} );
