const Leaflet = /** @type {LeafletModule} */ ( /** @type {unknown} */ ( require( '../vendor/leaflet/leaflet.js' ) ) );


/** @class */
module.exports = Leaflet.Popup.extend( /** @lends LeafletModule.Popup.prototype */ {
    options: {
        className: 'ext-datamaps-popup',
        maxWidth: 300
    },

    /**
     * @param {LeafletModule.Ark.PopupContentRendererGetterFn} content
     * @return {LeafletModule.Ark.Popup}
     */
    setContent( content ) {
        this.getContentManager = content;
        return this;
    },

    /**
     * @protected
     */
    _updateContent() {
        if ( !this._contentNode ) {
            return;
        }

        // Call the content manager getter and build its content
        if ( !this._content ) {
            this._content = /** @type {LeafletModule.Ark.IPopupContentRenderer} */ ( this.getContentManager() );
            this._content.build( this._contentNode );
            this._content.buildButtons( this._buttonArea );
        }

        // Call the update callback on the content manager
        this._content.onUpdate();
    },

    /**
     * @protected
     */
    _initLayout() {
        Leaflet.Popup.prototype._initLayout.call( this );
        this._buttonArea = Leaflet.DomUtil.create( 'div', 'ext-datamaps-popup-buttons', this._container );
    },

    /**
     * @param {LeafletModule.Map} map
     */
    onAdd( map ) {
        this._updateContent();
        Leaflet.Popup.prototype.onAdd.call( this, map );
        this._content.onAdd( this._isEphemeral );
    },

    onPromoted() {
        this._content.onPromoted();
    },

    /**
     * @param {LeafletModule.Map} map
     */
    onRemove( map ) {
        this._content.onRemove( this._isEphemeral );
        Leaflet.Popup.prototype.onRemove.call( this, map );
        // Wipe the pre-built content nodes if the provider does not want them to be kept around
        if ( !this._content.shouldKeepAround() ) {
            delete this._buttonArea;
            delete this._content;
            delete this._contentNode;
            setTimeout( () => delete this._container, map._fadeAnimated ? 300 : 0 );
        }
    }
} );
