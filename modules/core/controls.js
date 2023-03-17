/** @typedef {import( './map.js' )} DataMap */
const { CRSOrigin } = require( './enums.js' ),
    { createDomElement } = require( './util.js' );


/**
 * @typedef {Object} ControlOptions
 * @property {string} [tagName]
 * @property {string[]} [classes]
 * @property {boolean} [primary]
 * @property {boolean} [delegatedBuild] If true, {@link _build} call will be left to the subclass's constructor.
 */
/**
 * @typedef {Object} ControlButtonOptions
 * @property {boolean} [addToSelf]
 * @property {OO.ui.Icon} [icon]
 * @property {string} [label]
 * @property {boolean} [labelBeforeIcon]
 * @property {string} [tooltip]
 * @property {string[]} [classes]
 * @property {string} [href]
 * @property {EventListenerOrEventListenerObject} [clickHandler]
 */


/**
 * @abstract
 */
class MapControl {
    /**
     * @param {DataMap} map Owning map.
     * @param {string} id
     * @param {ControlOptions} [options]
     */
    constructor( map, id, options ) {
        options = options || {};
        /** @type {DataMap} */
        this.map = map;
        /** @type {HTMLElement} */
        this.element = document.createElement( options.tagName || 'div' );

        // The following classes are used here:
        // * datamap-control
        // * datamap-control-${id}
        this.element.classList.add( 'leaflet-control', 'ext-datamaps-control', `ext-datamaps-control-${id}` );
        if ( this.isButtonGroup() ) {
            this.element.classList.add( 'leaflet-bar' );
        }
        if ( options.classes ) {
            // eslint-disable-next-line mediawiki/class-doc
            this.element.classList.add( ...options.classes );
        }
        if ( options.primary ) {
            this.element.classList.add( 'ext-datamaps-control-primary' );
        }

        if ( !options.delegatedBuild ) {
            this._build();
        }
    }


    /**
     * @return {boolean}
     */
    isButtonGroup() {
        return true;
    }


    /**
     * @protected
     * @abstract
     */
    _build() {}


    /**
     * @protected
     * @param {ControlButtonOptions} options
     * @return {HTMLElement}
     */
    _makeButton( options ) {
        // eslint-disable-next-line mediawiki/class-doc
        const result = createDomElement( 'a', {
            classes: options.classes,
            html: options.label,
            attributes: {
                role: 'button',
                href: options.href,
                title: options.tooltip,
                'aria-disabled': 'false',
                'aria-label': options.tooltip
            },
            events: {
                click: options.clickHandler
            }
        } );

        if ( options.label ) {
            result.dataset.style = 'labelled';
        }

        if ( options.icon ) {
            // eslint-disable-next-line mediawiki/class-doc
            result[ options.labelBeforeIcon ? 'appendChild' : 'prepend' ]( createDomElement( 'span', {
                classes: [ `oo-ui-icon-${options.icon}` ]
            } ) );
        }

        if ( options.addToSelf ) {
            this.element.appendChild( result );
        }

        return result;
    }


    /**
     * @param {boolean} value
     * @since 0.16.0
     */
    setVisible( value ) {
        this.element.style.display = value ? '' : 'none';
    }
}


class BackgroundSwitcher extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'backgrounds', {
            tagName: 'select'
        } );
    }


    _build() {
        const element = /** @type {HTMLSelectElement} */ ( this.element );
        for ( const [ index, background ] of this.map.config.backgrounds.entries() ) {
            createDomElement( 'option', {
                text: background.name,
                attributes: {
                    value: index
                },
                appendTo: element
            } );
        }
        element.value = `${this.map.backgroundIndex}`;
        element.addEventListener( 'change', () => this.map.setBackgroundPreference( parseInt( element.value ) ) );
        this.map.on( 'backgroundChange', () => ( element.value = `${this.map.backgroundIndex}` ) );
    }
}


class Coordinates extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'coords' );
    }


    isButtonGroup() {
        return false;
    }


    _build() {
        this.map.leaflet.on( 'mousemove', event => {
            let lat = event.latlng.lat / this.map.crsScaleY;
            const lon = event.latlng.lng / this.map.crsScaleX;
            if ( this.map.crsOrigin === CRSOrigin.TopLeft ) {
                lat = this.map.config.crs[ 1 ][ 0 ] - lat;
            }
            this.element.innerText = this.map.getCoordLabel( lat, lon );
        } );
    }
}


class EditButton extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'edit' );
    }


    _build() {
        this._makeButton( {
            addToSelf: true,
            icon: 'edit',
            tooltip: mw.msg( 'datamap-control-edit' ),
            // @ts-ignore: wrong type signature for wikiScript in the package, argument is optional
            href: `${mw.util.wikiScript()}?curid=${this.map.id}&action=` + (
                mw.user.options.get( 'datamaps-enable-visual-editor' ) ? 'editmap' : 'edit'
            )
        } );
    }
}


class ExtraViewControls extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'viewcontrols' );
    }


    _build() {
        this._makeButton( {
            addToSelf: true,
            icon: 'imageLayoutFrame',
            tooltip: mw.msg( 'datamap-control-reset-view' ),
            clickHandler: () => this.map.restoreDefaultView()
        } );
        this._makeButton( {
            addToSelf: true,
            icon: 'alignCenter',
            tooltip: mw.msg( 'datamap-control-centre-view' ),
            clickHandler: () => this.map.centreView()
        } );
    }
}


module.exports = {
    MapControl,
    BackgroundSwitcher,
    Coordinates,
    EditButton,
    ExtraViewControls
};
