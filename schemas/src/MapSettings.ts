import { Colour3 } from "./CoreTypes";

export type MapSettings = Partial< {
    /**
     * Whether full-screen toggle will be shown to the user on this map.
     *
     * @since 0.16.0
     * @default true
     */
    allowFullscreen: boolean;

    /**
     * The backdrop colour, i.e. the one filling areas with no background image over them.
     *
     * @since 0.16.4
     * @default undefined
     */
    backdropColor?: Colour3;

    /**
     * Whether simply moving mouse cursor over a marker should cause its popup to become visible.
     *
     * Such popup will be partially translucent. The user still has to click on the marker for the address bar to update with a
     * permanent link.
     *
     * @since 0.16.3
     * @default false
     */
    enableTooltipPopups: boolean;

    /**
     * Whether marker search will be enabled for this map.
     *
     * @default false
     */
    enableSearch: boolean|'tabberWide';

    /**
     * Forces the legend (collectible checklists and marker filters) to not be loaded on this map.
     *
     * @default false
     */
    hideLegend: boolean;

    /**
     * Changes interaction delay model. Keybinds require extra keys to be held to zoom in (CTRL/Super), sleep is primarily
     * time-based.
     *
     * @since 0.16.3
     * @default 'keybinds'
     */
    interactionModel: 'keybinds'|'sleep';

    /**
     * Renderer preference for graphical icons using images from this wiki (not circular icons or pins).
     *
     * - DOM renderer provides best reactivity for a small data set (roughly 500 icons), but performance degrades with
     *   more markers. However, it comes with animation support for GIFs.
     * - Canvas renderer provides best performance at a cost of zoom update latency, and supports only static icons. This works
     *   best for bigger data sets (above 500 icons), and is automatically enabled for such sets (if this option is set to
     *   'auto').
     *
     * Pins always use the DOM renderer.
     *
     * @since 0.16.0
     * @default 'auto'
     */
    iconRenderer: 'auto'|'DOM'|'canvas';

    /**
     * Makes data validation disallow automatically generated marker IDs - the `id` property will need to be specified for each
     * marker manually.
     *
     * These identifiers are used for persistent links and collectible progress tracking. By default, group and layers the marker
     * is attached to along with its location on map are used to generate the identifier.
     *
     * @default false
     */
    requireCustomMarkerIDs: boolean;

    /**
     * Whether coordinates from under the mouse cursor will be shown on this map in the bottom-left corner.
     *
     * @default true
     */
    showCoordinates: boolean;

    /**
     * Specifies marker group checklist sort order.
     *
     * 'groupDeclaration': Follows the order in which marker groups are declared in source data.
     * 'amount':           Follows the number of markers inside each group.
     *
     * @default 'groupDeclaration'
     */
    sortChecklistsBy: 'groupDeclaration'|'amount';

    /**
     * Leaflet configuration.
     *
     * Check https://leafletjs.com/reference.html#map-option for reference. Some options are not supported, and some are custom.
     *
     * @default null
     */
    leaflet: Partial< {
        zoomSnap: number;
        zoomDelta: number;
        zoomAnimation: boolean;
        zoomAnimationThreshold: number;
        markerZoomAnimation: boolean;
        zoomControl: boolean;
        closePopupOnClick: boolean;
        doubleClickZoom: boolean;
        dragging: boolean;
        inertia: boolean;
        inertiaDeceleration: number;
        inertiaMaxSpeed: number;
        easeLinearity: number;
        maxBoundsViscosity: number;
        keyboard: boolean;
        keyboardPanDelta: number;
        scrollWheelZoom: boolean;
        wheelDebounceTime: number;
        wheelPxPerZoomLevel: number;
        boxZoom: boolean;
        touchZoom: boolean;
        tapHold: boolean;
        tapTolerance: number;
        bounceAtZoomLimits: boolean;
        rendererSettings: {
            padding: number;
        };
        autoMinZoom: boolean;
        autoMinZoomAbsolute: number;
        uriPopupZoom: number;
        shouldScaleMarkers: boolean;
        markerZoomScaleFactor: number;
        interactionControl: boolean;
    } >;
} >;
