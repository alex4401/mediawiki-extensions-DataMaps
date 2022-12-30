/** @typedef {import( './map.js' )} DataMap */
const CRSOrigin = require( './enums.js' ).CRSOrigin;


/**
 * @typedef {Object} ControlButtonOptions
 * @property {string} [icon]
 * @property {string} [label]
 * @property {string} [tooltip]
 * @property {string[]} [classes]
 * @property {string} [href]
 * @property {() => void} [clickHandler]
 */


/**
 * @abstract
 */
class MapControl {
    /**
     * @param {DataMap} map Owning map.
     * @param {string} id
     * @param {string} [tagName]
     * @param {string[]} [classes]
     */
    constructor( map, id, tagName, classes ) {
        /** @type {DataMap} */
        this.map = map;

        let finalClasses = [
            'leaflet-control',
            'datamap-control',
            `datamap-control-${id}`
        ];
        if ( classes ) {
            finalClasses = finalClasses.concat( classes );
        }

        // The following classes are used here:
        // * leaflet-control
        // * datamap-control
        /** @type {jQuery} */
        this.$element = $( document.createElement( tagName || 'div' ) ).addClass( finalClasses );

        this._build();
    }


    /**
     * @protected
     * @abstract
     */
    _build() {}


    /**
     * @protected
     * @param {ControlButtonOptions} options
     * @return {jQuery}
     */
    _makeButton( options ) {
        const $result = $( '<a>' )
            .attr( {
                role: 'button',
                title: options.tooltip,
                'aria-disabled': 'false',
                'aria-label': options.tooltip,
                href: options.href
            } );

        if ( options.classes ) {
            // eslint-disable-next-line mediawiki/class-doc
            $result.addClass( options.classes );
        }

        if ( options.icon ) {
            // eslint-disable-next-line mediawiki/class-doc
            $result.append( $( '<span>' ).addClass( `oo-ui-icon-${options.icon}` ) );
        }

        if ( options.label ) {
            $result.append( options.label );
        }

        if ( options.clickHandler ) {
            $result.on( 'click', options.clickHandler );
        }

        return $result;
    }
}
MapControl.BAR = 'leaflet-bar';


class BackgroundSwitcher extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'backgrounds', 'select', [ MapControl.BAR ] );
    }


    _build() {
        for ( const [ index, background ] of this.map.config.backgrounds.entries() ) {
            $( '<option>' ).attr( 'value', index ).text( /** @type {string} */ ( background.name ) ).appendTo( this.$element );
        }
        this.$element.val( this.map.backgroundIndex ).on( 'change', () => {
            this.map.setBackgroundPreference( /** @type {number} */ ( this.$element.val() ) );
        } );
        this.map.on( 'backgroundChange', () => this.$element.val( this.map.backgroundIndex ) );
    }
}


class Coordinates extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'coords' );
    }


    _build() {
        this.map.leaflet.on( 'mousemove', event => {
            let lat = event.latlng.lat / this.map.crsScaleY;
            const lon = event.latlng.lng / this.map.crsScaleX;
            if ( this.map.crsOrigin === CRSOrigin.TopLeft ) {
                lat = this.map.config.crs[ 1 ][ 0 ] - lat;
            }
            this.$element.text( this.map.getCoordLabel( lat, lon ) );
        } );
    }
}


class EditButton extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'edit', undefined, [ MapControl.BAR ] );
    }


    _build() {
        this._makeButton( {
            icon: 'edit',
            tooltip: mw.msg( 'datamap-control-edit' ),
            // @ts-ignore: wrong type signature for wikiScript in the package, argument is optional
            href: `${mw.util.wikiScript()}?curid=${this.map.id}&action=edit` + (
                mw.user.options.get( 'datamaps-enable-visual-editor' ) ? '&visual=1' : ''
            )
        } ).appendTo( this.$element );
    }
}


class ExtraViewControls extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'viewcontrols', undefined, [ MapControl.BAR ] );
    }


    _build() {
        this._makeButton( {
            icon: 'imageLayoutFrame',
            tooltip: mw.msg( 'datamap-control-reset-view' ),
            classes: [ 'datamap-control-viewreset' ],
            clickHandler: () => this.map.restoreDefaultView()
        } );
        this._makeButton( {
            icon: 'alignCenter',
            tooltip: mw.msg( 'datamap-control-centre-view' ),
            classes: [ 'datamap-control-viewcentre' ],
            clickHandler: () => this.map.centreView()
        } );
    }
}


class LegendPopup extends MapControl {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        super( map, 'legend-toggle', undefined, [ MapControl.BAR ] );
    }


    _build() {
        this._makeButton( {
            icon: 'funnel',
            label: mw.msg( 'datamap-legend-label' ),
            clickHandler: () => {
                this.map.$root.toggleClass( 'datamap-is-legend-toggled-on' );
                this.$element.find( 'span' ).toggleClass( 'oo-ui-image-progressive' );
            }
        } );
    }
}


module.exports = {
    MapControl,
    BackgroundSwitcher,
    Coordinates,
    EditButton,
    ExtraViewControls,
    LegendPopup
};
