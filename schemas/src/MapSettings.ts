export class MapSettings {
    /**
     */
    disableZoom: boolean = false;

    /**
     */
    enableSearch: boolean|'tabberWide' = false;

    /**
     */
    hideLegend: boolean = false;
    
    /**
     * 
     */
    iconRenderer: 'auto'|'DOM'|'canvas' = 'auto';

    /**
     */
    requireCustomMarkerIDs: boolean = false;

    /**
     */
    showCoordinates: boolean = true;

    /**
     */
    sortChecklistsBy: 'groupDeclaration'|'amount' = 'groupDeclaration';

    leaflet?: {
        minZoom?: number;
        maxZoom?: number;
        zoomSnap?: number;
        zoomDelta?: number;
        zoomAnimation?: boolean;
        zoomAnimationThreshold?: number;
        markerZoomAnimation?: boolean;
        zoomControl?: boolean;
        closePopupOnClick?: boolean;
        doubleClickZoom?: boolean;
        dragging?: boolean;
        inertia?: boolean;
        inertiaDeceleration?: number;
        inertiaMaxSpeed?: number;
        easeLinearity?: number;
        maxBoundsViscosity?: number;
        keyboard?: boolean;
        keyboardPanDelta?: number;
        scrollWheelZoom?: boolean;
        wheelDebounceTime?: number;
        wheelPxPerZoomLevel?: number;
        boxZoom?: boolean;
        touchZoom?: boolean;
        tapHold?: boolean;
        tapTolerance?: number;
        bounceAtZoomLimits?: boolean;
        rendererSettings?: {
            padding?: number;
        };
        autoMinZoom?: boolean;
        autoMinZoomAbsolute?: number;
        shouldScaleMarkers?: boolean;
        markerZoomScaleFactor?: number;
        interactionControl?: boolean;
    } = undefined;
}
