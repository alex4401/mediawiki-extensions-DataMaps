const Leaflet = require( '../vendor/leaflet/leaflet.js' ),
    DomEvent = Leaflet.DomEvent,
    DomUtil = Leaflet.DomUtil;


module.exports = Leaflet.Handler.extend( {
    addHooks() {
        this._pane = this._map.createPane( 'interactionWarningPane', this._map._container );
        // eslint-disable-next-line mediawiki/class-doc
        DomUtil.addClass( this._pane, 'datamap-overlay-status' );

        this._disableHandlers();

        this._onTouch = this._onTouch.bind( this );
        for ( const eventName of [ 'touchmove', 'touchend', 'touchcancel', 'click' ] ) {
            this._map._container.addEventListener( eventName, this._onTouch );
        }

        DomEvent.on( this._map._container, 'wheel', this._onScroll, this );

        DomEvent.on( this._map._container, 'mouseenter', this._onMouseOver, this );
        DomEvent.on( this._map._container, 'mouseleave', this._onMouseOut, this );
        for ( const eventName of [ 'movestart', 'move', 'moveend' ] ) {
            DomEvent.on( this._map, eventName, this._onDrag, this );
        }

        this._enableHandlers( [ 'scrollWheelZoom', 'dragging' ] );
    },


    removeHooks() {
        this._enableHandlers();

        for ( const eventName of [ 'touchmove', 'touchend', 'touchcancel', 'click' ] ) {
            this._map._container.removeEventListener( eventName, this._onTouch );
        }

        DomEvent.off( this._map._container, 'wheel', this._onScroll, this );
        DomEvent.off( this._map._container, 'mouseenter', this._onMouseOver, this );
        DomEvent.off( this._map._container, 'mouseleave', this._onMouseOut, this );

        for ( const eventName of [ 'movestart', 'move', 'moveend' ] ) {
            DomEvent.off( this._map, eventName, this._onDrag, this );
        }
    },


    showWarning( reason ) {
        // Messages that can be used here:
        // * datamap-interact-scroll
        // * datamap-interact-scroll-mac
        // * datamap-interact-touch
        this._pane.innerText = mw.msg( `datamap-interact-${reason}${Leaflet.Browser.mac && reason === 'scroll' ? '-mac' : ''}` );
        // eslint-disable-next-line mediawiki/class-doc
        DomUtil.addClass( this._pane, 'datamap-is-interaction-rejected' );

        if ( this._isRejectingInteraction ) {
            clearTimeout( this._isRejectingInteraction );
        }
        this._isRejectingInteraction = setTimeout( () => this.removeWarning( reason ), 1000 );

        switch ( reason ) {
            case 'scroll':
                this._disableHandlers( [ 'scrollWheelZoom' ] );
                break;
            case 'touch':
                this._disableHandlers();
                break;
        }
    },


    removeWarning( reason ) {
        if ( this._isRejectingInteraction ) {
            // eslint-disable-next-line mediawiki/class-doc
            DomUtil.removeClass( this._pane, 'datamap-is-interaction-rejected' );
            clearTimeout( this._isRejectingInteraction );
            this._isRejectingInteraction = null;

            switch ( reason ) {
                case 'scroll':
                    this._enableHandlers( [ 'scrollWheelZoom' ] );
                    break;
                case 'touch':
                    // this._enableHandlers();
                    break;
            }
        }
    },


    _onMouseOver() {
        this._enableHandlers();
    },


    _onMouseOut() {
        if ( !this._isDragging ) {
            this._disableHandlers();
        }
    },


    _enableHandlers( list ) {
        for ( const name of ( list || [ 'dragging', 'scrollWheelZoom', 'tapHold' ] ) ) {
            if ( this._map.options[ name ] && this._map[ name ] ) {
                this._map[ name ].enable();
            }
        }
    },


    _disableHandlers( list ) {
        for ( const name of ( list || [ 'dragging', 'scrollWheelZoom', 'tapHold' ] ) ) {
            if ( this._map.options[ name ] && this._map[ name ] ) {
                this._map[ name ].disable();
            }
        }
    },


    _onDrag( e ) {
        if ( e.type === 'movestart' || e.type === 'move' ) {
            this._isDragging = true;
        } else if ( e.type === 'moveend' ) {
            this._isDragging = false;
        }
    },


    _onTouch( e ) {
        if ( DomUtil.hasClass( e.target, 'leaflet-interactive' ) ) {
            if ( e.type === 'touchmove' && e.touches.length === 1 ) {
                this.showWarning( 'touch' );
            } else {
                this.removeWarning( 'touch' );
            }
        } else
        if ( e.type !== 'touchmove' && e.type !== 'touchstart' ) {
            this.removeWarning( 'touch' );
        } else if ( e.touches.length === 1 ) {
            this.showWarning( 'touch' );
        } else {
            e.preventDefault();
            this.removeWarning( 'touch' );
            this._enableHandlers();
        }
    },


    _onScroll( e ) {
        if ( this._map.scrollWheelZoom && this._map.scrollWheelZoom.enabled() ) {
            if ( e.metaKey || e.ctrlKey ) {
                e.preventDefault();
                this.removeWarning( 'scroll' );
            } else {
                this.showWarning( 'scroll' );
            }
        }
    }
} );
