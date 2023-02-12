/** @typedef {import( './map.js' )} DataMap */
const Util = require( './util.js' ),
    { MapFlags } = require( './enums.js' ),
    { createDomElement } = Util;


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
        /**
         * MultimediaViewer thumbnail index.
         *
         * @type {number?}
         */
        this.mmvThumbIndex = null;

        // These three containers are provided by Leaflet.Ark.Popup
        /** @type {!HTMLElement} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.buttonsElement = null;
        /** @type {!HTMLElement} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.contentElement = null;
        /** @type {!HTMLElement} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.actionsElement = null;

        // These elements are created during building
        /** @type {HTMLElement?} */
        this.subTitle = null;
        /** @type {HTMLElement?} */
        this.title = null;
        /** @type {HTMLElement?} */
        this.location = null;
        /** @type {HTMLElement?} */
        this.description = null;
        /** @type {HTMLElement?} */
        this.image = null;
        /** @type {HTMLElement?} */
        this.dismiss = null;
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
        const getLink = createDomElement( 'a', {
            classes: [ 'ext-datamaps-popup-link', 'oo-ui-icon-link' ],
            attributes: {
                role: 'button',
                title: mw.msg( 'datamap-popup-marker-link-get' ),
                'aria-label': mw.msg( 'datamap-popup-marker-link-get' ),
                href: Util.makeUrlWithParams( this.map, { marker: this.uid }, true )
            },
            events: {
                click: event => {
                    event.preventDefault();
                    // eslint-disable-next-line compat/compat
                    navigator.clipboard.writeText( /** @type {string} */ ( getLink.getAttribute( 'href' ) ) )
                        .then( () => mw.notify( mw.msg( 'datamap-popup-marker-link-copied' ) ) );
                }
            },
            appendTo: this.buttonsElement
        } );
    }


    /**
     * Builds contents of this popup.
     */
    build() {
        // Build the title
        if ( this.slots.label && this.markerGroup.name !== this.slots.label ) {
            this.$subTitle = $( createDomElement( 'b', {
                classes: [ 'ext-datamaps-popup-subtitle' ],
                text: this.markerGroup.name,
                appendTo: this.contentElement
            } ) );
            this.$title = $( createDomElement( 'b', {
                classes: [ 'ext-datamaps-popup-title' ],
                html: this.slots.label,
                appendTo: this.contentElement
            } ) );
        } else {
            this.$title = $( createDomElement( 'b', {
                classes: [ 'ext-datamaps-popup-title' ],
                text: this.markerGroup.name,
                appendTo: this.contentElement
            } ) );
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
        if ( this.map.isFeatureBitSet( MapFlags.ShowCoordinates ) ) {
            const coordText = this.map.getCoordLabel( this.leafletMarker.apiInstance );
            detailText = detailText ? `${coordText} (${detailText})` : coordText;
        }
        // Push onto the contents
        this.$location = $( createDomElement( 'div', {
            classes: [ 'ext-datamaps-popup-location' ],
            text: detailText,
            appendTo: this.contentElement
        } ) );

        // Description
        if ( this.slots.desc ) {
            if ( !this.slots.desc.startsWith( '<p>' ) ) {
                this.slots.desc = `<p>${this.slots.desc}</p>`;
            }
            this.$description = $( createDomElement( 'div', {
                classes: [ 'ext-datamaps-popup-description' ],
                html: this.slots.desc,
                appendTo: this.contentElement
            } ) );
        }

        // Image
        if ( this.slots.image ) {
            this.$image = $( createDomElement( 'img', {
                classes: [ 'ext-datamaps-popup-image' ],
                attributes: {
                    src: this.slots.image[ 0 ],
                    width: 250,
                    'data-file-width': this.slots.image[ 1 ],
                    'data-file-height': this.slots.image[ 2 ]
                },
                appendTo: this.contentElement
            } ) );
            this._setupMMVIntegration();
        }
    }


    /**
     * Initialises an action node.
     *
     * @since 0.14.4
     * @param {string} cssClass
     * @param {HTMLElement} child
     * @return {HTMLElement}
     */
    addAction( cssClass, child ) {
        // eslint-disable-next-line mediawiki/class-doc
        const result = createDomElement( 'li', {
            classes: [ cssClass ],
            appendTo: this.actionsElement
        } );
        result.appendChild( $( child )[ 0 ] );
        return result;
    }


    /**
     * Builds the action list of this popup.
     */
    buildActions() {
        // Related article
        let article = this.slots.article || this.markerGroup.article;
        if ( article ) {
            let msg = mw.msg( 'datamap-popup-related-article' );
            if ( article.indexOf( '|' ) >= 0 ) {
                const split = article.split( '|', 2 );
                msg = split[ 1 ];
                article = split[ 0 ];
            }

            this.addAction( 'datamap-popup-seemore', createDomElement( 'a', {
                text: msg,
                attributes: {
                    href: mw.util.getUrl( article )
                }
            } ) );
        }

        // Dismissables
        if ( Util.Groups.getCollectibleType( this.markerGroup ) ) {
            this.dismiss = createDomElement( 'a', {
                events: {
                    click: () => {
                        this.map.toggleMarkerDismissal( this.leafletMarker );
                        this.map.leaflet.closePopup();
                    }
                }
            } );
            this.addAction( 'datamap-popup-dismiss', this.dismiss );
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
     * @return {string}
     */
    _getDismissToolText() {
        // Messages that can be used here:
        // * datamap-popup-dismissed
        // * datamap-popup-mark-as-dismissed
        return mw.msg( 'datamap-popup-' + ( this.leafletMarker.options.dismissed ? 'dismissed' : 'mark-as-dismissed' ) );
    }


    /**
     * Updates the label of the collectible status change action.
     */
    onUpdate() {
        if ( this.dismiss ) {
            this.dismiss.innerText = this._getDismissToolText();
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
                if ( this.map.isFeatureBitSet( MapFlags.ShowCoordinates ) ) {
                    caption += ` (${this.map.getCoordLabel( this.leafletMarker.apiInstance )})`;
                }

                $image.on( 'click', event => {
                    // Do not interfere with non-left clicks or if modifier keys are pressed.
                    if ( ( event.button !== 0 && event.which !== 1 ) || event.altKey || event.ctrlKey || event.shiftKey
                        || event.metaKey ) {
                        return true;
                    }

                    mw.mmv.bootstrap.ensureEventHandlersAreSetUp();
                    mw.mmv.bootstrap.loadViewer( true ).then( viewer => {
                        if ( this.mmvThumbIndex === null ) {
                            const mmvThumb = {
                                thumb: $image[ 0 ],
                                $thumb: $image,
                                title,
                                link: title.getUrl( {} ),
                                alt: caption,
                                caption,
                                extraStatsDeferred: $.Deferred(),
                                image: null
                            };
                            if ( !viewer.thumbs ) {
                                viewer.thumbs = [];
                            }
                            viewer.thumbs.push( mmvThumb );
                            this.mmvThumbIndex = viewer.thumbs.length - 1;

                            mmvThumb.image = viewer.createNewImage(
                                mmvThumb.$thumb.prop( 'src' ),
                                mmvThumb.link,
                                mmvThumb.title,
                                this.mmvThumbIndex,
                                mmvThumb.thumb,
                                mmvThumb.caption,
                                mmvThumb.alt
                            );
                        }

                        // HACK: suppress MMV's setMediaHash on the whole page
                        if ( viewer._noSMH ) {
                            viewer.setMediaHash = () => {};
                            viewer._noSMH = true;
                        }

                        const thumb = viewer.thumbs[ this.mmvThumbIndex ];
                        viewer.loadImage( thumb.image, thumb.$thumb.clone()[ 0 ], false );
                    } );
                    event.preventDefault();
                    return false;
                } );
            } );
        }
    }
};
