// @ts-nocheck
// No @extends support on ES5-style classes (https://github.com/microsoft/TypeScript/issues/36369)


const MediaResultWidget = require( './MediaResultWidget.js' );


/**
 * @class
 * @extends {mw.widgets.MediaSearchWidget}
 *
 * @constructor
 * @param {OO.ui.SearchWidget.ConfigOptions} [config] Configuration options
*/
function MediaSearchWidget( config ) {
    MediaSearchWidget.super.call( this, config );

    this.results.on( 'choose', ( item, selected ) => {
        if ( selected ) {
            this.getQuery().setValue( item.data.title );
        }
    } );
}


OO.inheritClass( MediaSearchWidget, mw.widgets.MediaSearchWidget );


MediaSearchWidget.prototype.onResultsChange = function () {
};


/**
 * Process the media queue giving more items
 *
 * @method
 * @param {Object[]} items Given items by the media queue
 */
MediaSearchWidget.prototype.processQueueResults = function ( items ) {
    const resultWidgets = [],
        inputSearchQuery = this.getQueryValue(),
        queueSearchQuery = this.searchQueue.getSearchQuery();

    if ( this.currentQueue === this.searchQueue && ( inputSearchQuery === '' || queueSearchQuery !== inputSearchQuery ) ) {
        return;
    }

    for ( const item of items ) {
        const title = new mw.Title( item.title ).getMainText();
        // Do not insert duplicates
        if ( !Object.prototype.hasOwnProperty.call( this.itemCache, title ) ) {
            this.itemCache[ title ] = true;
            resultWidgets.push(
                new MediaResultWidget( {
                    data: item,
                    rowHeight: this.rowHeight,
                    maxWidth: this.results.$element.width() / 3,
                    minWidth: 30,
                    rowWidth: this.results.$element.width()
                } )
            );
        }
    }

    this.results.addItems( resultWidgets );
};


module.exports = MediaSearchWidget;
