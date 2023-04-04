/** @typedef {import( '../editor.js' )} MapVisualEditor */
const { LegendTabber, Util } = require( 'ext.datamaps.core' );


/**
 * @abstract
 */
module.exports = class VePanel extends LegendTabber.Tab {
    /**
     * @param {MapVisualEditor} editor
     * @param {string} baseMsg
     * @param {string[]} [cssClasses]
     */
    constructor( editor, baseMsg, cssClasses ) {
        // eslint-disable-next-line mediawiki/msg-doc
        super( Util.getNonNull( editor.map.legend ), mw.msg( baseMsg ), cssClasses );
        /** @type {string} */
        this._baseMsg = baseMsg;
        /** @type {MapVisualEditor} */
        this.editor = editor;

        this.editor.on( 'sourceData', this._importValuesFromData, this );
        this.editor.on( 'sourceData', this._bindInputs, this );
        this.editor.on( 'ready', () => this._setLock( false ), this );
        this.editor.on( 'save', () => this._cleanUpData, this );
    }


    /**
     * @param {string} key
     * @param {...string} parameters
     * @return {string}
     */
    msg( key, ...parameters ) {
        // eslint-disable-next-line mediawiki/msg-doc
        return mw.msg( `${this._baseMsg}-${key}`, ...parameters );
    }


    /**
     * @protected
     */
    _importValuesFromData() {}


    /**
     * @protected
     */
    _bindInputs() {}


    /**
     * @typedef {Object} InputBindingProperties
     * @property {Record<string, any>} target
     * @property {string} property
     * @property {( value: any ) => any} [transform]
     * @property {any} [gcValue]
     */

    /**
     * @param {OO.ui.InputWidget} input
     * @param {InputBindingProperties} params
     */
    _bindInputToProperty( input, params ) {
        if ( params.target[ params.property ] !== undefined ) {
            if ( input instanceof OO.ui.CheckboxInputWidget ) {
                input.setSelected( params.target[ params.property ] );
            } else {
                input.setValue( params.target[ params.property ] );
            }
        }
        input.on( 'change', value => {
            params.target[ params.property ] = params.transform ? params.transform( value ) : value;
        } );
        if ( params.gcValue !== undefined ) {
            this.editor.on( 'save', () => {
                if ( params.target[ params.property ] === params.gcValue ) {
                    delete params.target[ params.property ];
                }
            } );
        }
    }


    /**
     * @protected
     */
    _cleanUpData() {}


    /**
     * @protected
     * @param {boolean} value
     */
    _setLock( value ) {}


    /**
     * @param {OO.ui.InputWidget[]} widgets
     * @param {boolean} value
     */
    _setWidgetsLockState( widgets, value ) {
        for ( const widget of widgets ) {
            widget.setDisabled( value );
        }
    }
};
