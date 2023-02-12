/** @typedef {import( '../map.js' )} DataMap */
const { MapFlags } = require( '../enums.js' ),
    Util = require( '../util.js' );


/**
 * A tab manager for the legend.
 */
class LegendTabber {
    /**
     * @param {DataMap} map Owning map.
     * @param {HTMLElement} holderElement Element to host the legend in.
     */
    constructor( map, holderElement ) {
        /**
         * Owning map.
         *
         * @type {DataMap}
         */
        this.map = map;
        /**
         * Legend container element.
         *
         * @type {HTMLElement}
         */
        this.rootElement = holderElement;
        /**
         * Legend container widget.
         *
         * @type {OO.ui.Widget}
         */
        this.rootWidget = /** @type {OO.ui.Widget} */ ( OO.ui.Widget.static.infuse( holderElement ) );
        /**
         * Root DOM element of the legend container.
         *
         * @type {jQuery}
         */
        this.$root = this.rootWidget.$element.prependTo( Util.getNonNull( this.map.rootElement.querySelector(
            ':scope > .ext-datamaps-container-content' ) ) );
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
     * @return {LegendTabber.Tab}
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
}


/**
 * Tab abstraction specialised for DataMaps to reduce direct interactions with OOUI. If we ever switch away from it, this will
 * also reduce the impact on other components and gadgets.
 *
 * You should {@link LegendTabber.addTab add the tab} first to a {@link LegendTabber} before calling any of its methods.
 */
LegendTabber.Tab = class Tab {
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
};


module.exports = LegendTabber;
