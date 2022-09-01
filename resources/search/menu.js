function MenuWidget( config ) {
	MenuWidget.super.call( this, config );
}

OO.inheritClass( MenuWidget, OO.ui.MenuSelectWidget );


MenuWidget.static.flippedPositions = {
	below: 'below'
};


MenuWidget.prototype.getItemMatcher = function ( query, mode ) {
	const normalizeForMatching = this.constructor.static.normalizeForMatching,
		normalizedQuery = normalizeForMatching( query );

	return function ( item ) {
        if ( !item.data._map ) {
            return false;
        }

		const matchText = normalizeForMatching( item.data.apiInstance[2].search );
		return normalizedQuery === '' || matchText.indexOf( normalizedQuery ) !== -1;
	};
};


module.exports = MenuWidget;
