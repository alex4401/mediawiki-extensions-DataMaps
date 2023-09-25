const Leaflet = require( '../vendor/leaflet/leaflet.js' );

module.exports = Leaflet.DivIcon.extend( {
    options: {
        colour: '#fff',
        strokeColour: '#fff6',
        strokeWidth: 0.5,
        anchorToBottom: true
    },


    createIcon( oldIcon ) {
        const options = {
                colour: this.options.colour,
                strokeColour: this.options.strokeColour,
                strokeWidth: this.options.strokeWidth
            },
            Util = require( 'ext.datamaps.core' ).Util,
            root = ( oldIcon && oldIcon.tagName === 'SVG' ) ? oldIcon : Util.createPinIconElement( options );
        root.classList.add( 'leaflet-marker-icon', 'ext-datamaps-pin-marker-icon' );
        if ( oldIcon && oldIcon.tagName === 'SVG' ) {
            Util.applyPinIconAttributes( root.children[ 0 ], options );
        }
        root.style.width = `${this.options.iconSize[ 0 ].x}px`;
        root.style.height = `${this.options.iconSize[ 1 ].y}px`;
        return root;
    }
} );
