const Fuzzysort = require( 'ext.ark.datamaps.fuzzysort' ),
	MenuOptionWidget = require( './option.js' ),
	IsDebug = mw.config.get( 'debug' ) == 1;


function MenuWidget( config ) {
	MenuWidget.super.call( this, config );
}
OO.inheritClass( MenuWidget, OO.ui.MenuSelectWidget );


MenuWidget.static.flippedPositions = {
	below: 'below'
};


MenuWidget.static.normalizeForMatching = function ( text ) {
	// Replace trailing whitespace, normalize multiple spaces and make case insensitive
	return text.trim().replace( /\s+/, ' ' ).toLowerCase().normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' );
};


MenuWidget.prototype.updateItemVisibility = function () {
	if ( !this.filterFromInput || !this.$input ) {
		this.clip();
		return;
	}

	const results = Fuzzysort.go( MenuWidget.static.normalizeForMatching( this.$input.val() ), this.items, {
		threshold: -75000,
		weighedKey: 'keywords'
	} );

	for ( const item of this.items ) {
		if ( item instanceof OO.ui.OptionWidget ) {
			item.toggle( false );
		}
	}

	for ( const result of results ) {
		const item = result.obj;
		if ( item instanceof OO.ui.OptionWidget ) {
			item.toggle( true );
			item.$element.appendTo( this.$group );

			if ( IsDebug ) {
				let $scoreInfo = item.$label.find( 'span.datamap-search-debug' );
				if ( $scoreInfo.length == 0 ) {
					$scoreInfo = $( '<span class="datamap-search-debug" style="opacity: 0.6; font-size: 95%">' )
						.appendTo( item.$label );
				}
				$scoreInfo.text( ` / ${result.score}` );
			}
		}
	}

	this.$element.toggleClass( 'oo-ui-menuSelectWidget-invisible', results.length == 0 );

	// Reevaluate clipping
	this.clip();
};


MenuWidget.prototype.addItem = function ( config ) {
    config.keywords = config.keywords.map( x => [ Fuzzysort.prepare( MenuWidget.static.normalizeForMatching( x[0] ) ), x[1] ] );
	this.addItems( [ new MenuOptionWidget( config ) ] );
};


module.exports = MenuWidget;
