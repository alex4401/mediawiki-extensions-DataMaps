const NS_FILE = mw.config.get( 'wgNamespaceIds' ).file,
    { Util } = require( 'ext.datamaps.core' ),
    MediaSearchWidget = require( '../ooui/MediaSearchWidget.js' );


/** @typedef {import( '../editor.js' )} MapVisualEditor */


/**
 * @typedef {Object} AbstractField
 * @property {string} labelMsg
 * @property {string} [descMsg]
 * @property {RootObjectGetter} [rootOverride]
 * @property {string} property
 * @property {( value: any ) => any} [transform]
 */
/**
 * @typedef {Object} BoolFieldProps
 * @property {'checkbox'} type
 * @property {( value: boolean ) => boolean} [transform]
 * @property {boolean} default
 */
/**
 * @typedef {Object} ValueFieldProps
 * @property {'dropdown'} type
 * @property {[ label: string, value: any ][]} options
 * @property {number} default
 */
/**
 * @typedef {Object} NumberFieldProps
 * @property {'number'} type
 * @property {boolean} [required=false]
 * @property {number|undefined} default
 */
/**
 * @typedef {Object} TextFieldProps
 * @property {'longtext'|'text'} type
 * @property {boolean} [inline=false]
 * @property {string} [placeholder]
 * @property {boolean} [required=false]
 * @property {string} default
 */
/**
 * @typedef {Object} ImageFieldProps
 * @property {'media'} type
 * @property {string} default
 */
/**
 * @typedef {AbstractField & ( BoolFieldProps|ValueFieldProps|NumberFieldProps|TextFieldProps|ImageFieldProps )} FieldDescription
 */
/**
 * @typedef {Object} BuiltFieldProps
 * @property {OO.ui.Widget} _widget
 * @property {OO.ui.InputWidget} _input
 * @property {OO.ui.FieldLayout} _field
 */
/**
 * @typedef {FieldDescription & BuiltFieldProps} BuiltField
 */
/** @typedef {( data: import( './dataCapsule' ).Schema_DataMap ) => Record<string, any>} RootObjectGetter */


class DataEditorUiBuilder {
    /**
     * @param {MapVisualEditor} editor
     * @param {string} messageKey
     * @param {RootObjectGetter} rootGetter
     */
    constructor( editor, messageKey, rootGetter ) {
        /**
         * @private
         * @type {MapVisualEditor}
         */
        this._editor = editor;
        /** @type {HTMLElement} */
        this.element = Util.createDomElement( 'div', {
            classes: [ 'ext-datamaps-ve-dataeditor' ]
        } );
        /** @type {string} */
        this.messageKey = messageKey;
        /** @type {RootObjectGetter} */
        this._getRootInternal = rootGetter;
        /** @type {BuiltField[]} */
        this._builtFields = [];
        /** @type {boolean} */
        this._isLocked = false;
    }


    /**
     * @param {string|null|{
     *   label?: string,
     *   horizontal?: boolean
     * }} labelOrOptions
     * @param {FieldDescription[]} fields
     * @return {DataEditorUiBuilder}
     */
    addSection( labelOrOptions, fields ) {
        return this.addCustomSection( labelOrOptions, this._buildFields( fields ) );
    }


    /**
     * @param {FieldDescription[]} fields
     * @return {DataEditorUiBuilder}
     */
    addFields( fields ) {
        return this.addSection( {}, fields );
    }


    /**
     * @param {string|null|{
     *   label?: string,
     *   horizontal?: boolean
     * }} labelOrOptions
     * @param {OO.ui.FieldLayout[]} widgets
     * @return {DataEditorUiBuilder}
     */
    addCustomSection( labelOrOptions, widgets ) {
        const options = typeof labelOrOptions === 'string' ? { label: labelOrOptions } : ( labelOrOptions || {} ),
            // eslint-disable-next-line mediawiki/class-doc
            layout = new OO.ui.FieldsetLayout( {
                // eslint-disable-next-line mediawiki/msg-doc
                label: options.label ? this.msg( `set-${options.label}` ) : undefined,
                classes: options.horizontal ? [ 'ext-datamaps-ve-fieldset-horizontal' ] : undefined
            } );
        layout.$element.appendTo( this.element );
        layout.addItems( widgets );
        return this;
    }


    /**
     * @param {string} key
     * @param {...string} parameters
     * @return {string}
     */
    msg( key, ...parameters ) {
        // eslint-disable-next-line mediawiki/msg-doc
        return mw.msg( `${this.messageKey}-${key}`, ...parameters );
    }


    /**
     * @param {boolean} value
     * @return {this}
     */
    setLock( value ) {
        for ( const field of this._builtFields ) {
            field._input.setDisabled( value );
        }
        return this;
    }


    /**
     * @return {HTMLElement}
     */
    finish() {
        this._editor.on( 'sourceData', this._restoreValues, this );
        return this.element;
    }


    /**
     * @private
     * @param {FieldDescription[]} fields
     * @return {OO.ui.FieldLayout[]}
     */
    _buildFields( fields ) {
        if ( this._isLocked ) {
            throw new Error( 'Cannot add new fields after source data has been bound.' );
        }

        const fieldLayouts = [];

        for ( const field of fields ) {
            let /** @type {OO.ui.Widget?} */ mainWidget = null,
                /** @type {OO.ui.InputWidget?} */ inputWidget;
            const isInline = 'inline' in field && field.inline;

            switch ( field.type ) {
                case 'number':
                    inputWidget = new OO.ui.NumberInputWidget( {
                        required: field.required
                    } );
                    break;
                case 'text':
                    inputWidget = new OO.ui.TextInputWidget( {
                        required: field.required,
                        spellcheck: true
                    } );
                    break;
                case 'longtext':
                    inputWidget = new OO.ui.MultilineTextInputWidget( {
                        required: field.required,
                        spellcheck: true
                    } );
                    break;
                case 'checkbox':
                    inputWidget = new OO.ui.CheckboxInputWidget();
                    break;
                case 'dropdown':
                    inputWidget = new OO.ui.DropdownInputWidget( {
                        options: field.options.map( item => /** @type {OO.ui.DropdownInputWidget.Option} */ ( {
                            data: item[ 1 ],
                            // eslint-disable-next-line mediawiki/msg-doc
                            label: this.msg( `${field.labelMsg}-${item[ 0 ]}` )
                        } ) )
                    } );
                    field.default = field.options[ field.default ][ 1 ];
                    break;
                case 'media':
                    mainWidget = new MediaSearchWidget( { } );
                    inputWidget = /** @type {MediaSearchWidget} */ ( mainWidget ).getQuery();
                    break;
                default:
                    throw new Error( 'Attempted to create field UI for an unknown type.' );
            }

            inputWidget.setDisabled( true );
            this._setInputWidgetValue( inputWidget, field.default );
            inputWidget.on( 'change', value => {
                if ( typeof value === 'string' && field.type === 'dropdown' ) {
                    // OOUI turns values into strings...
                    const normalised = field.options.find( x => `${x[ 1 ]}` === value );
                    if ( normalised ) {
                        value = normalised[ 1 ];
                    }
                } else if ( field.type === 'number' ) {
                    value = parseFloat( value );
                }
                this._setProperty( field, value );
            } );

            const fieldWidget = new OO.ui.FieldLayout( mainWidget || inputWidget, {
                label: isInline ? undefined : this.msg( field.labelMsg ),
                help: field.descMsg ? this.msg( field.descMsg ) : undefined,
                helpInline: true,
                align: field.type === 'dropdown' ? 'top' : 'inline'
            } );

            if ( isInline || ( 'placeholder' in field && field.placeholder ) ) {
                inputWidget.$input.attr( 'placeholder', field.placeholder || this.msg( field.labelMsg ) );
            }

            fieldLayouts.push( fieldWidget );
            this._builtFields.push( Object.assign( {
                _widget: Util.getNonNull( mainWidget || inputWidget ),
                _input: Util.getNonNull( inputWidget ),
                _field: fieldWidget
            }, field ) );
        }

        return fieldLayouts;
    }


    /**
     * @private
     * @param {RootObjectGetter} getterFn
     * @return {Record<string, any>}
     */
    _invokeRootGetter( getterFn ) {
        return getterFn( this._editor.dataCapsule.get() );
    }


    /**
     * @private
     * @param {AbstractField} field
     * @return {Record<string, any>}
     */
    _getFieldRoot( field ) {
        if ( field.rootOverride ) {
            return this._invokeRootGetter( field.rootOverride );
        }
        return this._invokeRootGetter( this._getRootInternal );
    }


    /**
     * @param {FieldDescription} field
     * @param {any} value
     */
    _setProperty( field, value ) {
        if ( field.transform ) {
            value = field.transform( value );
        }
        if ( field.default === value ) {
            delete this._getFieldRoot( field )[ field.property ];
        } else {
            this._getFieldRoot( field )[ field.property ] = value;
        }
    }


    /**
     * @param {OO.ui.InputWidget} widget
     * @param {any} value
     */
    _setInputWidgetValue( widget, value ) {
        if ( widget instanceof OO.ui.CheckboxInputWidget ) {
            widget.setSelected( value );
        } else {
            widget.setValue( value );
        }
    }


    _restoreValues() {
        this._isLocked = true;
        for ( const field of this._builtFields ) {
            const root = this._getFieldRoot( field );
            if ( field.property in root ) {
                if ( 'options' in field && !field.options.find( x => x[ 1 ] === root[ field.property ] ) ) {
                    field._field.$field.hide();
                    field._field.setWarnings( [
                        mw.msg( 'datamap-ve-field-locked-unknown-value' )
                    ] );
                }
                this._setInputWidgetValue( field._input, root[ field.property ] );
            }
        }
    }
}


/**
 * @constant
 * @type {( value: boolean ) => boolean}
 */
DataEditorUiBuilder.INVERT_BOOL = value => !value;


module.exports = DataEditorUiBuilder;
