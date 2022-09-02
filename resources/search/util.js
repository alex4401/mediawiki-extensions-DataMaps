module.exports.extractText = function ( input ) {
    return input.replace( /<!--[\s\S]*?-->/gi, '' ).replace( /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, '' );
};


module.exports.decodePartial = function ( input ) {
    return input.replace( /&#39;/g, "'" ).replace( /&#34;/g, '"' ).replace( /&#32;/g, ' ' );
}