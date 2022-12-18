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
        path.setAttribute( 'd', 'M 10,0 C 5.4971441,-0.21118927 1.7888107,3.4971441 2,8 c 0,2.52 2,5 3,6 1,1 5,6 5,6 0,0 4,-5 5,'
            + '-6 1,-1 3,-3.48 3,-6 0.211189,-4.5028559 -3.497144,-8.21118927 -8,-8 z' );
        const circle = document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' );
        circle.setAttribute( 'cx', '10' );
        circle.setAttribute( 'cy', '8' );
        circle.setAttribute( 'r', '3.3' );
        circle.style.fill = '#0009';
        root.appendChild( path );
        root.appendChild( circle );

        return root;
    }
} );
