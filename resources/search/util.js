module.exports.extractText = function ( input ) {
    return input.replace( /<!--[\s\S]*?-->/gi, '' ).replace( /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, '' );
};