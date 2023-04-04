/** @typedef {import( '../editor.js' )} MapVisualEditor */
/** @typedef {import( 'core/controls.js' ).ControlButtonOptions} ControlButtonOptions */
const { DataMap, Controls } = require( 'ext.datamaps.core' );


/**
 * @typedef {Object} WorkflowMountConfig
 * @property {string} id
 * @property {string} msg
 * @property {string} icon
 * @property {OO.ui.Window.Size} [size]
 * @property {undefined|'primary'} [button]
 * @property {typeof DataMap.anchors[ keyof typeof DataMap.anchors ]} [anchor]
 */
/**
 * @typedef {Object} WorkflowMountConfigPrivate
 * @property {string} id
 * @property {string} msg
 * @property {string} icon
 * @property {OO.ui.Window.Size} size
 * @property {undefined|'primary'} button
 * @property {typeof DataMap.anchors[ keyof typeof DataMap.anchors ]} anchor
 */


/**
 * @abstract
 * @template {string} TActionTypes
 */
class DialogController {
    /**
     * @param {MapVisualEditor} editor
     * @param {string} messageKey
     * @param {OO.ui.ProcessDialog} dialog
     */
    constructor( editor, messageKey, dialog ) {
        /** @type {MapVisualEditor} */
        this.editor = editor;
        /** @type {string} */
        this.messageKey = messageKey;
        /** @type {OO.ui.ProcessDialog} */
        this.dialog = dialog;
        /** @type {HTMLElement} */
        this.contentElement = this.dialog.$body[ 0 ];
    }


    /**
     * @protected
     * @abstract
     * @return {OO.ui.ActionWidget.ConfigOptions[]}
     */
    static getActions() {
        throw new Error( 'DialogController#getActions not implemented' );
    }


    /**
     * @package
     * @param {MapVisualEditor} editor
     * @param {string} id
     * @param {string} messageKey
     */
    static _registerOouiClass( editor, id, messageKey ) {
        const ControllerClass = this,
            actions = this.getActions();

        /**
         * @class
         * @extends {OO.ui.ProcessDialog}
         * @param {OO.ui.ProcessDialog.ConfigOptions} config
         */
        const DialogClass = function ( config ) {
            OO.ui.ProcessDialog.call( this, config );
        };
        OO.inheritClass( DialogClass, OO.ui.ProcessDialog );
        DialogClass.static.name = id;
        // eslint-disable-next-line mediawiki/msg-doc
        DialogClass.static.title = mw.msg( messageKey );
        DialogClass.static.actions = actions;
        DialogClass.prototype.initialize = function () {
            OO.ui.ProcessDialog.prototype.initialize.call( this );
            this._controller = new ControllerClass( editor, messageKey, this );
        };
        DialogClass.prototype.getSetupProcess = function ( data ) {
            return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
                .next( () => this.actions.setMode( actions[ 0 ].action ), this );
        };
        DialogClass.prototype.getActionProcess = function ( action ) {
            const result = this._controller.getActionProcess( action );
            if ( result !== null ) {
                return result;
            }
            return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
        };

        editor.windowFactory.register( DialogClass );
    }


    /**
     * @param {MapVisualEditor} editor
     * @param {string} id
     * @param {string} messageKey
     */
    static registerStandalone( editor, id, messageKey ) {
        this._registerOouiClass( editor, id, messageKey );
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


    build() {
    }


    /**
     * @param {TActionTypes} action
     * @return {OO.ui.Process?}
     */
    getActionProcess( action ) {
        return null;
    }
}


/** @type {OO.ui.ActionWidget.ConfigOptions} */
DialogController.CLOSE_ACTION = {
    label: 'Cancel',
    flags: [ 'safe', 'close' ]
};


/**
 * @abstract
 */
class VeWorkflow {
    /**
     * @public
     * @abstract
     * @param {MapVisualEditor} editor
     */
    /**
     * @protected
     * @param {typeof DialogController<string>} TController
     * @param {MapVisualEditor} editor
     * @param {WorkflowMountConfig} unsafeMountConfig
     */
    constructor( TController, editor, unsafeMountConfig ) {
        unsafeMountConfig.id = `mve-${unsafeMountConfig.id}`;
        unsafeMountConfig.size = unsafeMountConfig.size || 'medium';
        unsafeMountConfig.anchor = unsafeMountConfig.anchor || DataMap.anchors.topLeft;
        const mountConfig = /** @type {WorkflowMountConfigPrivate} */ ( unsafeMountConfig );

        TController._registerOouiClass( editor, mountConfig.id, mountConfig.msg );

        /** @type {MapVisualEditor} */
        this.editor = editor;
        /** @type {string} */
        this.messageKey = mountConfig.msg;
        /**
         * @protected
         * @type {VeWorkflow._Control}
         */
        this._control = editor.map.addControl( mountConfig.anchor, new VeWorkflow._Control( editor, mountConfig ) );
    }
}


/**
 * @package
 */
VeWorkflow._Control = class _Control extends Controls.MapControl {
    /**
     * @param {MapVisualEditor} editor
     * @param {WorkflowMountConfigPrivate} mountConfig
     */
    constructor( editor, mountConfig ) {
        super( editor.map, mountConfig.id, {
            primary: mountConfig.button === 'primary',
            delegatedBuild: true
        } );

        this._makeButton( {
            addToSelf: true,
            icon: mountConfig.icon,
            // eslint-disable-next-line mediawiki/msg-doc
            [ mountConfig.button ? 'label' : 'tooltip' ]: mw.msg( mountConfig.msg ),
            labelBeforeIcon: true,
            clickHandler: () => editor.windowManager.openWindow( mountConfig.id )
        } );
    }
};


module.exports = {
    VeWorkflow,
    DialogController
};
