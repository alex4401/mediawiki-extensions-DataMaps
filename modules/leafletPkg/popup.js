const Leaflet = /** @type {LeafletModule} */ ( /** @type {unknown} */ ( require( '../vendor/leaflet/leaflet.js' ) ) );


/** @class */
module.exports = Leaflet.Popup.extend( /** @lends LeafletModule.Popup.prototype */ {
    options: {
        className: 'datamap-popup'
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
            /** @type {LeafletModule.Ark.IPopupContentRenderer} */
            this._content = this.getContentManager();
            // Inject node references
            this._content.$content = $( this._contentNode );
            this._content.$buttons = this.$customButtonArea;
            this._content.$actions = $( '<ul class="datamap-popup-tools">' );
            // Build the contents
            this._content.buildButtons();
            this._content.build();
            this._content.buildActions();
            // If tools are not empty, push them onto the content. Otherwise destroy the node and remove the reference.
            if ( this._content.$actions.children().length > 0 ) {
                this._content.$actions.appendTo( this._content.$content );
            } else {
                delete this._content.$actions;
            }
        }

        // Call the update callback on the content manager
        this._content.onUpdate();
    },

    /**
     * @protected
     */
    _initLayout() {
        Leaflet.Popup.prototype._initLayout.call( this );

        this.$customButtonArea = $( '<div class="datamap-popup-buttons">' ).appendTo( this._container );
    },

    /**
     * @param {LeafletModule.Map} map
     */
    onAdd( map ) {
        this._updateContent();
        Leaflet.Popup.prototype.onAdd.call( this, map );
        this._content.onAdd();
    },

    /**
     * @param {LeafletModule.Map} map
     */
    onRemove( map ) {
        Leaflet.Popup.prototype.onRemove.call( this, map );
        this._content.onRemove();

        // Wipe the pre-built content nodes if the provider does not want them to be kept around
        if ( !this._content.shouldKeepAround() ) {
            delete this._container;
            delete this._content;
            delete this._contentNode;
        }
    }
} );
