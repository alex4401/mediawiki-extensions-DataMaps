const MarkerSearchIndex = require( './indexing.js' ),
    IsDebug = mw.config.get( 'debug' );


function MenuWidget( config ) {
    MenuWidget.super.call( this, config );
}
OO.inheritClass( MenuWidget, OO.ui.MenuSelectWidget );


MenuWidget.static.flippedPositions = {
    below: 'below'
};


MenuWidget.prototype.updateItemVisibility = function () {
    if ( !this.filterFromInput || !this.$input ) {
        this.clip();
        return;
    }

    // For whatever reason, OOUI triggers filters on any key press...
    if ( this._filteredFor === this.$input.val() ) {
        return;
    }
    this._filteredFor = this.$input.val();

    const results = MarkerSearchIndex.query( this.items, this.$input.val() );

    for ( const item of this.items ) {
        if ( item instanceof OO.ui.OptionWidget ) {
            item.toggle( false );
        }
    }

    let index = 0;
    for ( const result of results ) {
        const item = result.obj;
        if ( item instanceof OO.ui.OptionWidget ) {
            item._order = index++;
            item.toggle( true );
            item.$element.appendTo( this.$group );

            if ( IsDebug ) {
                let $scoreInfo = item.$label.find( 'span.datamap-search-debug' );
                if ( $scoreInfo.length === 0 ) {
                    $scoreInfo = $( '<span class="datamap-search-debug" style="opacity: 0.6; font-size: 95%">' )
                        .appendTo( item.$label );
                }
                $scoreInfo.text( ` / ${result.score}` );
            }
        }
    }
    this.$element.toggleClass( 'oo-ui-menuSelectWidget-invisible', results.length === 0 );
    // Keep this in sync with display order for highlighting
    this.items.sort( ( a, b ) => {
        return b.visible - a.visible !== 0 ? ( b.visible - a.visible ) : ( a._order - b._order );
    } );

    // Reevaluate clipping
    this.clip();
};


module.exports = MenuWidget;
