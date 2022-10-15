module.exports = class EventEmitter {
    constructor() {
        this._handlers = {};
    }


    on( event, callback, context ) {
        if ( !this._handlers[event] ) {
            this._handlers[event] = [];
        }

        this._handlers[event].push( {
            context: context || null,
            method: callback
        } );
    }


    off( event, callback ) {
        if ( !callback ) {
            delete this._handlers[event];
            return;
        }

        if ( this._handlers[event] ) {
            this._handlers[event] = this._handlers[event].filter( x => x.method != callback );

            if ( this._handlers[event].length == 0 ) {
                delete this._handlers[event];
            }
        }
    }


    _invokeEventHandler( handler, args ) {
        try {
            handler.method.apply( handler.context, args );
        } catch ( error ) {
            // If a listener throws an exception, do not disrupt the emitter's routine, and rethrow the exception later
            setTimeout( () => {
                throw error;
            } );
        }
    }


    fire( event ) {
        if ( !this._handlers[event] ) {
            return;
        }

        const args = Object.values( arguments ).slice( 1 );
        for ( const handler of this._handlers[event] ) {
            this._invokeEventHandler( handler, args );
        }
    }
}