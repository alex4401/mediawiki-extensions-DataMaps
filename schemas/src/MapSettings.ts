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
     */
    requireCustomMarkerIDs: boolean = false;

    /**
     */
    showCoordinates: boolean = true;

    /**
     */
    sortChecklistsBy: 'location'|'amount' = 'location';

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
        allowIconsOnCanvas?: boolean;
    } = undefined;
}
