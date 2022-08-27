function EventEmitter() {
    this._handlers = {};
}


EventEmitter.prototype.on = function ( event, callback, context ) {
    if ( !this._handlers[event] ) {
        this._handlers[event] = [];
    }

    this._handlers[event].push( {
        context: context || null,
        method: callback
    } );
};


EventEmitter.prototype.off = function ( event, callback ) {
    if ( this._handlers[event] ) {
        this._handlers[event] = this._handlers[event].filter( x => x.method != callback );

        if ( this._handlers[event].length == 0 ) {
            delete this._handlers[event];
        }
    }
};


EventEmitter.prototype.fire = function ( event ) {
    if ( !this._handlers[event] ) {
        return;
    }

    const args = Object.values( arguments ).slice( 1 );
    for ( const handler of this._handlers[event] ) {
        try {
            handler.method.apply( handler.context, args );
        } catch ( error ) {
            // If a listener throws an exception, do not disrupt the emitter's routine, and rethrow the exception later.
            setTimeout( ( function ( error ) {
                throw error;
            } ).bind( null, error ) );
        }
    }
}


module.exports = EventEmitter;