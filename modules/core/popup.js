const Util = require( './util.js' ),
    Enums = require( './enums.js' );
/** @typedef {import( './map.js' )} DataMap */


/**
 * @implements {LeafletModule.Ark.IPopupContentRenderer}
 */
module.exports = class MarkerPopup {
    // TODO: document lifetime

    /**
     * @param {DataMap} map
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    constructor( map, leafletMarker ) {
        /**
         * Owning map.
         *
         * @type {DataMap}
         */
        this.map = map;
        /**
         * Associated marker.
         *
         * @type {LeafletModule.AnyMarker}
         */
        this.leafletMarker = leafletMarker;
        /**
         * Marker group configuration.
         *
         * @type {DataMaps.Configuration.MarkerGroup}
         */
        this.markerGroup = map.config.groups[ this.leafletMarker.attachedLayers[ 0 ] ];
        /**
         * Slot data of the associated marker.
         *
         * @type {DataMaps.IApiMarkerSlots}
         */
        this.slots = this.leafletMarker.apiInstance[ 2 ] || {};
        /**
         * Unique identifier of the associated marker.
         *
         * @type {string|number}
         */
        this.uid = Util.getMarkerId( this.leafletMarker );

        // These three containers are provided by Leaflet.Ark.Popup
        /** @type {!jQuery} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.$buttons = null;
        /** @type {!jQuery} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.$content = null;
        /**
         * @type {!jQuery}
         * @deprecated To be renamed to $actions in v0.15.0.
         */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.$tools = null;

        // These elements are created during building
        /** @type {jQuery?} */
        this.$subTitle = null;
        /** @type {jQuery?} */
        this.$title = null;
        /** @type {jQuery?} */
        this.$location = null;
        /** @type {jQuery?} */
        this.$description = null;
        /** @type {jQuery?} */
        this.$image = null;
    }


    /**
     * Binds a dynamically initialised popup to a marker. The renderer class is provided by the map via the
     * {@link DataMap.getPopupClass} method.
     *
     * @param {DataMap} map
     * @param {LeafletModule.AnyMarker} leafletMarker
     */
    static bindTo( map, leafletMarker ) {
        leafletMarker.bindPopup( () => new ( map.getPopupClass() )( map, leafletMarker ), {
            keepInView: true
        }, Util.getLeaflet().Ark.Popup );
    }


    /**
     * Whether the popup manager should retain the DOM nodes after the popup is closed.
     *
     * @return {boolean}
     */
    shouldKeepAround() {
        return true;
    }


    /**
     * Builds the buttons.
     */
    buildButtons() {
        const $getLink = $( '<a class="datamap-marker-link-button oo-ui-icon-link" role="button"></a>' )
            .attr( {
                title: mw.msg( 'datamap-popup-marker-link-get' ),
                'aria-label': mw.msg( 'datamap-popup-marker-link-get' ),
                href: Util.makeUrlWithParams( this.map, { marker: this.uid }, true )
            } )
            .appendTo( this.$buttons )
            .on( 'click', event => {
                event.preventDefault();
                // eslint-disable-next-line compat/compat
                navigator.clipboard.writeText( /** @type {string} */ ( $getLink.attr( 'href' ) ) )
                    .then( () => mw.notify( mw.msg( 'datamap-popup-marker-link-copied' ) ) );
            } );
    }


    /**
     * Builds contents of this popup.
     */
    build() {
        // Build the title
        if ( this.slots.label && this.markerGroup.name !== this.slots.label ) {
            this.$subTitle = $( '<b class="datamap-popup-subtitle">' ).text( this.markerGroup.name )
                .appendTo( this.$content );
            this.$title = $( '<b class="datamap-popup-title">' ).html( this.slots.label ).appendTo( this.$content );
        } else {
            this.$title = $( '<b class="datamap-popup-title">' ).text( this.markerGroup.name )
                .appendTo( this.$content );
        }

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
        if ( this.map.isFeatureBitSet( Enums.MapFlags.ShowCoordinates ) ) {
            const coordText = this.map.getCoordLabel( this.leafletMarker.apiInstance );
            detailText = detailText ? `${coordText} (${detailText})` : coordText;
        }
        // Push onto the contents
        /* DEPRECATED(v0.14.1:v0.15.0): datamap-popup-coordinates replaced with datamap-popup-location */
        this.$location = $( '<div class="datamap-popup-location datamap-popup-coordinates">' ).text( detailText )
            .appendTo( this.$content );

        // Description
        if ( this.slots.desc ) {
            if ( !this.slots.desc.startsWith( '<p>' ) ) {
                this.slots.desc = `<p>${this.slots.desc}</p>`;
            }
            this.$description = $( '<div class="datamap-popup-description">' ).html( this.slots.desc )
                .appendTo( this.$content );
        }

        // Image
        if ( this.slots.image ) {
            this.$image = $( '<img class="datamap-popup-image" width=250 />' )
                .attr( {
                    src: this.slots.image[ 0 ],
                    'data-file-width': this.slots.image[ 1 ],
                    'data-file-height': this.slots.image[ 2 ]
                } )
                .appendTo( this.$content );

            this._setupMMVIntegration();
        }
    }


    /**
     * Initialises an action node.
     *
     * @since 0.14.4
     * @param {string} cssClass
     * @param {jQuery} $child
     * @return {jQuery}
     */
    addAction( cssClass, $child ) {
        return $( `<li class="${cssClass}">` ).append( $child ).appendTo( this.$tools );
    }


    /**
     * @deprecated Renamed to addAction in v0.14.4; to be removed in v0.15.0.
     * @param {string} cssClass
     * @param {jQuery} $child
     * @return {jQuery}
     */
    addTool( cssClass, $child ) {
        return this.addAction( cssClass, $child );
    }


    /**
     * Builds the action list of this popup.
     *
     * @deprecated To be renamed to buildActions in v0.15.0.
     */
    buildTools() {
        // Related article
        let article = this.slots.article || this.markerGroup.article;
        if ( article ) {
            let msg = mw.msg( 'datamap-popup-related-article' );
            if ( article.indexOf( '|' ) >= 0 ) {
                const split = article.split( '|', 2 );
                msg = split[ 1 ];
                article = split[ 0 ];
            }

            this.addAction( 'datamap-popup-seemore',
                $( '<a>' ).attr( 'href', mw.util.getUrl( article ) ).text( msg ) );
        }

        // Dismissables
        if ( Util.getGroupCollectibleType( this.markerGroup ) ) {
            this.$dismiss = $( '<a>' ).on( 'click', () => {
                this.map.toggleMarkerDismissal( this.leafletMarker );
                this.map.leaflet.closePopup();
            } );
            this.addAction( 'datamap-popup-dismiss', this.$dismiss );
        }
    }


    /**
     * Updates URL with currently opened marker.
     */
    onAdd() {
        Util.updateLocation( this.map, { marker: this.uid } );
    }


    /**
     * Updates URL to remove the marker parameter.
     */
    onRemove() {
        Util.updateLocation( this.map, { marker: null } );
    }


    /**
     * Returns a label for the collectible status change action.
     *
     * @protected
     * @deprecated Public access is deprecated as of v0.14.4, and will be fully removed in v0.15.0.
     * @return {string}
     */
    getDismissToolText() {
        // Messages that can be used here:
        // * datamap-popup-dismissed
        // * datamap-popup-mark-as-dismissed
        return mw.msg( 'datamap-popup-' + ( this.leafletMarker.options.dismissed ? 'dismissed' : 'mark-as-dismissed' ) );
    }


    /**
     * Updates the label of the collectible status change action.
     */
    onUpdate() {
        if ( this.$dismiss ) {
            this.$dismiss.text( this.getDismissToolText() );
        }
    }


    /**
     * Sets up MultimediaViewer integration on the popup's image.
     *
     * @private
     */
    _setupMMVIntegration() {
        if ( mw.config.get( 'wgMediaViewer' ) ) {
            const $image = /** @type {jQuery!} */ ( this.$image );
            mw.loader.using( 'mmv.bootstrap', () => {
                const title = mw.Title.newFromImg( $image );
                let caption = this.markerGroup.name;
                if ( this.map.isFeatureBitSet( Enums.MapFlags.ShowCoordinates ) ) {
                    caption += ` (${this.map.getCoordLabel( this.leafletMarker.apiInstance )})`;
                }

                mw.mmv.bootstrap.thumbs.push( {
                    thumb: $image[ 0 ],
                    $thumb: this.$image,
                    title,
                    link: title.getUrl( {} ),
                    alt: caption,
                    caption
                } );
                this.thumbIndex = mw.mmv.bootstrap.thumbs.length - 1;

                $image.on( 'click', event => mw.mmv.bootstrap.click( $image[ 0 ], event, title ) );
            } );
        }
    }
};
