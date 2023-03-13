const Leaflet = require( '../vendor/leaflet/leaflet.js' );

module.exports = Leaflet.DivIcon.extend( {
    options: {
        colour: '#fff',
        anchorToBottom: true
    },


    createIcon( oldIcon ) {
        const root = ( oldIcon && oldIcon.tagName === 'SVG' ) ? oldIcon
            : require( 'ext.datamaps.core' ).Util.createPinIconElement();
        root.classList.add( 'leaflet-marker-icon', 'ext-datamaps-pin-marker-icon' );
        root.setAttribute( 'fill', this.options.colour );
        root.style.width = `${this.options.iconSize[ 0 ].x}px`;
        root.style.height = `${this.options.iconSize[ 1 ].y}px`;
        return root;
    }
} );
