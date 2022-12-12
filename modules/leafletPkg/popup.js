const Leaflet = require( '../vendor/leaflet/leaflet.js' );


module.exports = Leaflet.Popup.extend( {
    options: {
        className: 'datamap-popup'
    },

    setContent( content ) {
        this.getContentManager = content;
        return this;
    },

    _updateContent() {
        if ( !this._contentNode ) {
            return;
        }

        // Call the content manager getter and build its content
        if ( !this._content ) {
            this._content = this.getContentManager();
            // Inject node references
            this._content.$content = $( this._contentNode );
            this._content.$buttons = this.$customButtonArea;
            this._content.$tools = $( '<ul class="datamap-popup-tools">' );
            // Build the contents
            this._content.buildButtons();
            this._content.build();
            this._content.buildTools();
            // Push the tools onto the content
            this._content.$tools.appendTo( this._content.$content );
        }

        // Call the update callback on the content manager
        this._content.onUpdate();
    },

    _initLayout() {
        Leaflet.Popup.prototype._initLayout.call( this );

        this.$customButtonArea = $( '<div class="datamap-popup-buttons">' ).appendTo( this._container );
    },

    onAdd( map ) {
        this._updateContent();
        Leaflet.Popup.prototype.onAdd.call( this, map );
        this._content.onAdd();
    },

    onRemove( map ) {
        Leaflet.Popup.prototype.onRemove.call( this, map );
        this._content.onRemove();

        // Wipe the pre-built content nodes if the provider does not want them to be kept around
        if ( !this._content.shouldKeepAround() ) {
            this._content = null;
            this._contentNode = null;
        }
    }
} );
