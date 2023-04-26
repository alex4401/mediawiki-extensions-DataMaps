/** @typedef {import( './map.js' )} DataMap */
const { CRSOrigin } = require( './enums.js' ),
    { isVisualEditorEnabled, createDomElement, getNonNull } = require( './util.js' );


/**
 * @typedef {Object} ControlOptions
 * @property {string} [tagName='div'] HTML element tag name.
 * @property {string[]} [classes] List of CSS classes to add to the element.
 * @property {boolean} [primary] Whether to use action-indicative styling.
 * @property {boolean} [delegatedBuild] If true, {@link _build} call will be left to the subclass's constructor.
 */
/**
 * @typedef {Object} ControlButtonOptions
 * @property {boolean} [addToSelf] Whether to add the button to the end of the control automatically.
 * @property {OO.ui.Icon} [icon] OOUI icon name, if any.
 * @property {string} [label] Label text, if any.
 * @property {boolean} [labelBeforeIcon] Whether to put the label before icon.
 * @property {string} [tooltip] Tooltip, if any.
 * @property {string[]} [classes] CSS classes to add to the button element, if any.
 * @property {EventListenerOrEventListenerObject} [clickHandler] Click event handler, if any.
 * @property {boolean} [returnToMap=true]
 */


/**
 * Base class for all custom map controls.
 *
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
        /**
         * @protected
         * @type {boolean}
         */
        this._isVisible = true;

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
     * Whether this control contains buttons and wants to be styled as one (equivalent of Leaflet's "bar" class).
     *
     * @return {boolean}
     */
    isButtonGroup() {
        return true;
    }


    /**
     * Builds the control's elements. This is invoked by the constructor if {@link ControlOptions.delegatedBuild} is not truey.
     *
     * There may be cases where you may want to handle element creation within the constructor.
     *
     * @protected
     */
    _build() {}


    /**
     * Creates a button from options. See {@link ControlButtonOptions}.
     *
     * @protected
     * @param {ControlButtonOptions} options
     * @return {HTMLElement}
     */
    _makeButton( options ) {
        // eslint-disable-next-line mediawiki/class-doc
        const result = createDomElement( 'button', {
            classes: options.classes,
            html: options.label,
            attributes: {
                role: 'button',
                title: options.tooltip,
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

        if ( options.returnToMap !== false ) {
            result.addEventListener( 'click', () => this._refocusMap() );
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
        if ( this._isVisible !== value ) {
            this.element.style.display = value ? '' : 'none';
            this._isVisible = value;
        }
    }


    /**
     * @return {boolean}
     * @since 0.16.0
     */
    isVisible() {
        return this.element.style.display !== 'none';
    }


    /**
     * Returns focus back to the map.
     *
     * @protected
     */
    _refocusMap() {
        this.map.leaflet.getContainer().focus();
    }
}


/**
 * Control to let the user switch map backgrounds.
 */
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


/**
 * Coordinates-under-cursor control.
 */
class Coordinates extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'coords' );
    }


    _build() {
        this.setVisible( false );
        this.map.leaflet.on( 'mousemove', event => {
            this.setVisible( true );
            this.element.innerText = this.map.getCoordinateLabel( event.latlng );
        } );
        this.map.leaflet.on( 'mouseover', () => this.setVisible( true ) );
        this.map.rootElement.addEventListener( 'mouseout', () => this.setVisible( false ) );
    }
}


/**
 * Control displaying a button leading to user's editor of choice.
 */
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
            clickHandler: () => {
                // @ts-ignore: wrong type signature for wikiScript in the package, argument is optional
                location.href = `${mw.util.wikiScript()}?curid=${this.map.id}&action=` + (
                    isVisualEditorEnabled && mw.user.options.get( 'datamaps-enable-visual-editor' ) ? 'editmap' : 'edit'
                );
            }
        } );
    }
}


/**
 * View reset and centre buttons.
*/
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


/**
 * Button to toggle fullscreen mode of the map.
 */
class ToggleFullscreen extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'toggle-fullscreen' );

        this._button = this._makeButton( {
            addToSelf: true,
            icon: 'fullScreen',
            tooltip: mw.msg( 'datamap-control-fullscreen' ),
            clickHandler: () => {
                this.map.setFullScreen( !this.map.isFullScreen() );
                this._refreshIcon();
            }
        } );
    }


    _refreshIcon() {
        const state = this.map.isFullScreen(),
            element = getNonNull( this._button.firstElementChild );
        element.classList[ state ? 'add' : 'remove' ]( 'oo-ui-icon-exitFullscreen' );
        element.classList[ state ? 'remove' : 'add' ]( 'oo-ui-icon-fullScreen' );
    }
}


module.exports = {
    MapControl,
    BackgroundSwitcher,
    Coordinates,
    EditButton,
    ExtraViewControls,
    ToggleFullscreen
};
