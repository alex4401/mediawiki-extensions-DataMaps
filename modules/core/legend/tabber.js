/** @typedef {import( '../map.js' )} DataMap */
const { MapFlags } = require( '../enums.js' );


/**
 * A tab manager for the legend.
 */
class LegendTabber {
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
        this.$root = this.rootWidget.$element.prependTo( /** @type {!HTMLElement} */ ( this.map.rootElement.querySelector(
            ':scope > .datamap-container-content' ) ) );
        /**
         * Tabber layout of the legend.
         *
         * @type {OO.ui.IndexLayout}
         */
        this.layout = new OO.ui.IndexLayout( {
            expanded: false
        } );

        // Append the IndexLayout to the root
        this.layout.$element.appendTo( this.$root );
    }


    /**
     * Creates a {@link LegendTabber.Tab} with a given name and CSS classes, then adds it to this tabber.
     *
     * @param {string} name
     * @param {string[]} [cssClasses]
     * @param {boolean} [visible]
     * @return {Tab}
     */
    createTab( name, cssClasses, visible ) {
        return new LegendTabber.Tab( this, name, cssClasses ).setVisible( !!visible );
    }


    /**
     * Hides the legend if there's no visible tabs.
     */
    updateVisibility() {
        this.rootWidget.setDisabled( !( this.map.isFeatureBitSet( MapFlags.VisualEditor )
            || this.layout.getTabs().getItemCount() > 0 ) );
    }


    /**
     * TODO: move into a separate class
     *
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
}


/**
 * Tab abstraction specialised for DataMaps to reduce direct interactions with OOUI. If we ever switch away from it, this will
 * also reduce the impact on other components and gadgets.
 *
 * You should {@link LegendTabber.addTab add the tab} first to a {@link LegendTabber} before calling any of its methods.
 */
class Tab {
    /**
     * @param {LegendTabber} tabber
     * @param {string} name
     * @param {string[]} [cssClasses]
     */
    constructor( tabber, name, cssClasses ) {
        /**
         * @type {LegendTabber}
         */
        this.tabber = tabber;
        /**
         * @type {DataMap}
         */
        this.map = tabber.map;
        /**
         * @protected
         * @type {OO.ui.TabPanelLayout}
         */
        // eslint-disable-next-line mediawiki/class-doc
        this.tab = new OO.ui.TabPanelLayout( name, {
            label: name,
            expanded: false,
            classes: cssClasses || []
        } );
        /**
         * Content node.
         *
         * @public
         * @type {HTMLElement}
         */
        this.contentElement = this.tab.$element[ 0 ];
    }


    /**
     * @param {boolean} value
     * @return {this}
     */
    setVisible( value ) {
        // @ts-ignore: second parameter "index" not needed
        this.tabber.layout[ value ? 'addTabPanels' : 'removeTabPanels' ]( [ this.tab ] );
        this.tabber.updateVisibility();
        return this;
    }
}


// Workaround for TypeScript not recognising classes when they're a property on another class
LegendTabber.Tab = Tab;


module.exports = LegendTabber;
