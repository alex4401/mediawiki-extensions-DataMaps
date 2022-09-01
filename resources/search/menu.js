function MenuWidget( config ) {
	MenuWidget.super.call( this, config );
}

OO.inheritClass( MenuWidget, OO.ui.MenuSelectWidget );


MenuWidget.static.flippedPositions = {
	below: 'below'
};


MenuWidget.prototype.getItemMatcher = function ( query, mode ) {
	const normalizedQuery = this.constructor.static.normalizeForMatching( query ).split( ' ' );

	return function ( item ) {
        if ( !item.data._map ) {
            return false;
        }

		const keywords = item.data.apiInstance[2].search;
        let result;
        for ( let index = 0; index < keywords.length; index++ ) {
            result = keywords[index].indexOf( normalizedQuery );
            if ( result > -1 ) {
                return result;
            }
        }
        return -1;
    };
};


OO.ui.MenuSelectWidget.prototype.updateItemVisibility = function () {
	if ( !this.filterFromInput || !this.$input ) {
		this.clip();
		return;
	}

	var anyVisible = false;

	var showAll = !this.isVisible() || this.previouslySelectedValue === this.$input.val(),
		filter = showAll ? null : this.getItemMatcher( this.$input.val(), this.filterMode );
	// Hide non-matching options, and also hide section headers if all options
	// in their section are hidden.
	var item;
	var section, sectionEmpty;
	for ( var i = 0; i < this.items.length; i++ ) {
		item = this.items[ i ];
		if ( item instanceof OO.ui.OptionWidget ) {
			item.affinity = filter ? filter( item ) : -1;
            var visible = item.affinity > -1;
			anyVisible = anyVisible || visible;
			sectionEmpty = sectionEmpty && !visible;
			item.toggle( visible );
		}
	}
	// Process the final section
	if ( section ) {
		section.toggle( showAll || !sectionEmpty );
	}

	if ( !anyVisible ) {
		this.highlightItem( null );
	}

	this.$element.toggleClass( 'oo-ui-menuSelectWidget-invisible', !anyVisible );

	if ( this.highlightOnFilter &&
		!( this.lastHighlightedItem && this.lastHighlightedItem.isSelectable() ) &&
		this.isVisible()
	) {
		// Highlight the first selectable item in the list
		item = this.findFirstSelectableItem();
		this.highlightItem( item );
		this.lastHighlightedItem = item;
	}

	// Reevaluate clipping
	this.clip();
};


module.exports = MenuWidget;
