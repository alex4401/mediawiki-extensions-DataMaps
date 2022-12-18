const Leaflet = require( '../vendor/leaflet/leaflet.js' );

module.exports = Leaflet.DivIcon.extend( {
    options: {
        className: 'leaflet-marker-icon datamap-pin-marker-icon',
        colour: '#fff'
    },


    createIcon( oldIcon ) {
        const root = ( oldIcon && oldIcon.tagName === 'SVG' ) ? oldIcon : mw.dataMaps.Util.createPinIconElement();
        root.setAttribute( 'fill', this.options.colour );
        root.style.marginLeft = `${-this.options.iconSize[ 0 ] / 2}px`;
        root.style.marginTop = `${-this.options.iconSize[ 1 ] / 2}px`;
        root.style.width = `${this.options.iconSize[ 0 ].x}px`;
        root.style.height = `${this.options.iconSize[ 1 ].y}px`;
        return root;
    }
} );
