const Util = require( './util.js' ),
    Enums = require( './enums.js' );
/** @typedef {import( './map.js' )} DataMap */


module.exports = class MarkerPopup {
    // TODO: document lifetime

    /**
     * @param {DataMap} map
     * @param {LeafletModule.CircleMarker|LeafletModule.Marker} leafletMarker
     */
    constructor( map, leafletMarker ) {
        this.map = map;
        this.leafletMarker = leafletMarker;
        this.markerGroup = map.config.groups[ this.leafletMarker.attachedLayers[ 0 ] ];
        this.slots = this.leafletMarker.apiInstance[ 2 ] || {};
        this.uid = Util.getMarkerId( this.leafletMarker );
        // These two containers are provided by Leaflet.Ark.Popup
        /** @type {!jQuery} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.$buttons = null;
        /** @type {!jQuery} */
        // @ts-ignore: Initialised by Leaflet.Ark.Popup, ideally we'd use null assertions here
        this.$content = null;
        /** @type {!jQuery} */
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
     * @param {DataMap} map
     * @param {LeafletModule.CircleMarker|LeafletModule.Marker} leafletMarker
     */
    static bindTo( map, leafletMarker ) {
        leafletMarker.bindPopup( () => new ( map.getPopupClass() )( map, leafletMarker ), {}, Util.getLeaflet().Ark.Popup );
    }


    shouldKeepAround() {
        return true;
    }


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
                navigator.clipboard.writeText( $getLink.attr( 'href' ) )
                    .then( () => mw.notify( mw.msg( 'datamap-popup-marker-link-copied' ) ) );
            } );
    }


    /*
     * Builds popup contents for a marker instance
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
     * @param {string} cssClass
     * @param {jQuery} $child
     * @return {jQuery}
     */
    addTool( cssClass, $child ) {
        return $( `<li class="${cssClass}">` ).append( $child ).appendTo( this.$tools );
    }


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

            this.addTool( 'datamap-popup-seemore',
                $( '<a>' ).attr( 'href', mw.util.getUrl( article ) ).text( msg ) );
        }

        // Dismissables
        if ( Util.getGroupCollectibleType( this.markerGroup ) ) {
            this.$dismiss = $( '<a>' ).on( 'click', () => {
                this.map.toggleMarkerDismissal( this.leafletMarker );
                this.map.leaflet.closePopup();
            } );
            this.addTool( 'datamap-popup-dismiss', this.$dismiss );
        }
    }


    onAdd() {
        Util.updateLocation( this.map, { marker: this.uid } );
    }


    onRemove() {
        Util.updateLocation( this.map, { marker: null } );
    }


    getDismissToolText() {
        // Messages that can be used here:
        // * datamap-popup-dismissed
        // * datamap-popup-mark-as-dismissed
        return mw.msg( 'datamap-popup-' + ( this.leafletMarker.options.dismissed ? 'dismissed' : 'mark-as-dismissed' ) );
    }


    onUpdate() {
        if ( this.$dismiss ) {
            this.$dismiss.text( this.getDismissToolText() );
        }
    }


    _setupMMVIntegration() {
        if ( mw.config.get( 'wgMediaViewer' ) ) {
            mw.loader.using( 'mmv.bootstrap', () => {
                const title = mw.Title.newFromImg( this.$image );
                let caption = this.markerGroup.name;
                if ( this.map.isFeatureBitSet( Enums.MapFlags.ShowCoordinates ) ) {
                    caption += ` (${this.map.getCoordLabel( this.leafletMarker.apiInstance )})`;
                }

                mw.mmv.bootstrap.thumbs.push( {
                    thumb: this.$image[ 0 ],
                    $thumb: this.$image,
                    title,
                    link: title.getUrl(),
                    alt: caption,
                    caption
                } );
                this.thumbIndex = mw.mmv.bootstrap.thumbs.length - 1;

                this.$image.on( 'click', event => mw.mmv.bootstrap.click( this.$image[ 0 ], event, title ) );
            } );
        }
    }
};
