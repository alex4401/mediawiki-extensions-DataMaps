module.exports = class MapLegend {
    constructor( map ) {
        this.map = map;
        // DOM element of the legend container
        this.$root = new OO.ui.Widget( {
            classes: [ 'datamap-container-legend' ],
            content: [
                new OO.ui.LabelWidget( {
                    label: mw.msg( 'datamap-legend-label' ),
                    classes: [ 'datamap-legend-label', 'oo-ui-tabSelectWidget-framed' ]
                } )
            ]
        } ).$element.prependTo( this.map.$root.find( '> .datamap-container-content' ) );
        // IndexLayout of the legend panel
        this.tabLayout = new OO.ui.IndexLayout( {
            expanded: false
        } );

        // Append the IndexLayout to the root
        this.tabLayout.$element.appendTo( this.$root );
    }


    addTab( name, cssClass, visible ) {
        const result = new OO.ui.TabPanelLayout( {
            name,
            label: name,
            expanded: false,
            classes: cssClass ? [ cssClass ] : []
        } );
        this.tabLayout.addTabPanels( [ result ] );
        if ( visible === false ) {
            this.setTabVisibility( result, false );
        }
        this.reevaluateVisibility();
        return result;
    }


    setTabVisibility( tab, value ) {
        tab.toggle( value );
        tab.getTabItem().toggle( value );

        if ( this.tabLayout.tabSelectWidget.findSelectedItem() == tab.getTabItem() ) {
            this.tabLayout.tabSelectWidget.selectItem( null );
            this.tabLayout.selectFirstSelectableTabPanel();
        }

        this.reevaluateVisibility();
    }


    reevaluateVisibility() {
        if ( this.tabLayout.getTabs().getItems().some( item => item.isVisible() ) ) {
            if ( !this.$root.is( ':visible' ) ) {
                this.tabLayout.selectFirstSelectableTabPanel();
            }
            this.$root.show();
        } else {
            this.$root.hide();
        }
    }


    createCheckboxField( $parent, label, defaultState, changeCallback ) {
        const checkbox = new OO.ui.CheckboxInputWidget( { selected: defaultState } );
        const field = new OO.ui.FieldLayout( checkbox, {
            label,
            align: 'inline'
        } );
        checkbox.on( 'change', () => changeCallback( checkbox.isSelected() ) );
        field.$element.appendTo( $parent );
        return [ checkbox, field ];
    }
}