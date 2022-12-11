const Leaflet = require( '../vendor/leaflet/leaflet.js' );

module.exports = Leaflet.DivIcon.extend( {
    options: {
        className: 'leaflet-marker-icon datamap-pin-marker-icon',
        colour: '#fff'
    },


    createIcon( oldIcon ) {
        const root = ( oldIcon && oldIcon.tagName === 'SVG' ) ? oldIcon : this._createNew();
        root.style.fill = this.options.colour;
        root.style.marginLeft = `${-this.options.iconSize[ 0 ] / 2}px`;
        root.style.marginTop = `${-this.options.iconSize[ 1 ] / 2}px`;
        root.style.width = `${this.options.iconSize[ 0 ].x}px`;
        root.style.height = `${this.options.iconSize[ 1 ].y}px`;
        return root;
    },


    _createNew() {
        const root = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
        root.setAttribute( 'viewBox', '0 0 20 20' );
        const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
        path.setAttribute( 'd', 'M10 0a7.65 7.65 0 0 0-8 8c0 2.52 2 5 3 6s5 6 5 6 4-5 5-6 3-3.48 3-6a7.65 7.65 0 0 0-8-8zm0 '
            + '11.25A3.25 3.25 0 1 1 13.25 8 3.25 3.25 0 0 1 10 11.25z' );
        root.appendChild( path );

        return root;
    }
} );
