/** @typedef {import( './editor.js' )} MapVisualEditor */
const { DataMap, MarkerPopup, Util } = require( 'ext.datamaps.core' ),
    DataEditorUiBuilder = require( './dataEditorUi.js' ),
    DataCapsule = require( './dataCapsule.js' );


module.exports = class EditableMarkerPopup extends MarkerPopup {
    /**
     * @param {InstanceType< DataMap >} map
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    constructor( map, leafletMarker ) {
        super( map, leafletMarker );

        /**
         * @private
         * @type {MapVisualEditor}
         */
        this._editor = this.slots.editor;
        /**
         * @private
         * @type {import( '../../schemas/src/index' ).Marker}
         */
        this._source = this.slots.raw;
    }


    shouldKeepAround() {
        return false;
    }


    /**
     * Builds the buttons.
     *
     * @param {HTMLElement} element
     */
    buildButtons( element ) {
        Util.createDomElement( 'a', {
            classes: [ 'ext-datamaps-popup-ve-delete', 'oo-ui-icon-trash' ],
            attributes: {
                role: 'button',
                href: '#',
                title: mw.msg( 'datamap-ve-panel-marker-delete' )
            },
            events: {
                click: event => {
                    event.preventDefault();
                    this.map.leaflet.closePopup();

                    // TODO: safety
                    const association = this.leafletMarker.attachedLayers.join( ' ' );
                    const source = DataCapsule.getField( this._editor.dataCapsule.get(), 'markers', {} )[ association ];
                    source.splice( source.indexOf( this._source ), 1 );

                    this.map.layerManager.removeMember( this.leafletMarker );
                }
            },
            appendTo: element
        } );
    }


    /**
     * @param {HTMLElement} element
     */
    buildHeader( element ) {
        this.subTitle = Util.createDomElement( 'b', {
            classes: [ 'ext-datamaps-popup-subtitle' ],
            text: this.markerGroup.name,
            appendTo: element
        } );
        const uiBuilder = new DataEditorUiBuilder( this._editor, 'datamap-ve-panel-marker', {
            rootGetter: () => this._source,
            fields: [
                {
                    type: 'text',
                    inline: true,
                    labelMsg: 'field-name',
                    property: 'name',
                    default: ''
                }
            ]
        } ).setLock( false );
        element.appendChild( uiBuilder.element );

        // Collect layer discriminators
        /** @type {string[]} */
        const discrims = [];
        this.leafletMarker.attachedLayers.forEach( ( layerId, index ) => {
            const layer = this.map.config.layers[ layerId ];
            if ( index > 0 && layer && layer.discrim ) {
                discrims.push( layer.discrim );
            }
        } );

        // Gather detail text from layers
        let detailText = discrims.join( ', ' );
        // Reformat if coordinates are to be shown
        const coordText = this.map.getCoordinateLabel( this.leafletMarker.apiInstance );
        detailText = detailText ? `${coordText} (${detailText})` : coordText;
        // Push onto the contents
        this.location = Util.createDomElement( 'div', {
            classes: [ 'ext-datamaps-popup-location' ],
            text: detailText,
            appendTo: element
        } );
    }

    /**
     * Builds contents of this popup.
     *
     * @param {HTMLElement} element
     */
    buildContent( element ) {
        const
            mainUiBuilder = new DataEditorUiBuilder( this._editor, 'datamap-ve-panel-marker', {
                rootGetter: () => this._source,
                fields: [
                    {
                        type: 'longtext',
                        inline: true,
                        labelMsg: 'field-desc',
                        property: 'description',
                        default: ''
                    }
                ]
            } ).setLock( false ),
            advUiBuilder = new DataEditorUiBuilder( this._editor, 'datamap-ve-panel-marker', {
                rootGetter: () => this._source,
                fields: [
                    {
                        type: 'text',
                        labelMsg: 'field-id',
                        property: 'id',
                        required: this._editor.doesRequireMarkerIds(),
                        placeholder: Util.getGeneratedMarkerId( this.leafletMarker ),
                        default: ''
                    }
                ]
            } ).setLock( false );

        element.appendChild( mainUiBuilder.element );
        Util.createDomElement( 'b', {
            text: mw.msg( 'datamap-ve-panel-marker-advanced' ),
            appendTo: element
        } );
        element.appendChild( advUiBuilder.element );

        // TODO: image
    }


    /**
     * Builds the action list of this popup.
     *
     * @param {HTMLElement} element
     */
    buildActions( element ) {
    }


    onAdd() {}
    onRemove() { }
};
