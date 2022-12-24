/** @typedef {import( './map.js' )} DataMap */
const Enums = require( './enums.js' );


module.exports = class LegendTabManager {
    /**
     * @param {DataMap} map Owning map.
     */
    constructor( map ) {
        /**
         * Owning map.
         *
         * @type {DataMap}
         */
        this.map = map;
        /**
         * Legend container widget.
         *
         * @type {OO.ui.Widget}
         */
        this.rootWidget = new OO.ui.Widget( {
            classes: [ 'datamap-container-legend' ],
            content: [
                new OO.ui.LabelWidget( {
                    label: mw.msg( 'datamap-legend-label' ),
                    classes: [ 'datamap-legend-label', 'oo-ui-tabSelectWidget-framed' ]
                } )
            ]
        } );
        /**
         * Root DOM element of the legend container.
         *
         * @type {jQuery}
         */
        this.$root = this.rootWidget.$element.prependTo( this.map.$root.find( '> .datamap-container-content' ) );
        /**
         * Tabber layout of the legend.
         *
         * @type {OO.ui.IndexLayout}
         */
        this.tabLayout = new OO.ui.IndexLayout( {
            expanded: false
        } );

        // Append the IndexLayout to the root
        this.tabLayout.$element.appendTo( this.$root );
    }


    /**
     * @param {string} name Tab name.
     * @param {string?} [cssClass] CSS class.
     * @param {boolean} [visible] If not hidden by default.
     * @return {OO.ui.TabPanelLayout}
     */
    addTab( name, cssClass, visible ) {
        // eslint-disable-next-line mediawiki/class-doc
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


    /**
     * Changes a tab's visibility, and updates the legend's visibility as well.
     *
     * @param {OO.ui.TabPanelLayout} tab
     * @param {boolean} value
     */
    setTabVisibility( tab, value ) {
        tab.toggle( value );
        tab.getTabItem().toggle( value );

        if ( this.tabLayout.tabSelectWidget.findSelectedItem() === tab.getTabItem() ) {
            this.tabLayout.tabSelectWidget.selectItem( null );
            this.tabLayout.selectFirstSelectableTabPanel();
        }

        this.reevaluateVisibility();
    }


    /**
     * Hides the legend if there's no visible tabs.
     */
    reevaluateVisibility() {
        if ( this.map.isFeatureBitSet( Enums.MapFlags.VisualEditor ) ) {
            this.rootWidget.setDisabled( false );
            return;
        }

        if ( this.tabLayout.getTabs().getItems().some( item => item.isVisible() ) ) {
            // eslint-disable-next-line no-jquery/no-sizzle
            if ( !this.$root.is( ':visible' ) ) {
                this.tabLayout.selectFirstSelectableTabPanel();
            }
            this.rootWidget.setDisabled( false );
        } else {
            this.rootWidget.setDisabled( true );
        }
    }


    /**
     * @param {jQuery} $parent
     * @param {string} label
     * @param {boolean} defaultState
     * @param {( value: boolean ) => void} changeCallback
     * @return {[ OO.ui.CheckboxInputWidget, OO.ui.FieldLayout ]}
     */
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
};
