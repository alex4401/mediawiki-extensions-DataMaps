declare namespace LeafletModule {
    class LatLng {
        constructor(latitude: number, longitude: number, altitude?: number);
        equals(otherLatLng: LatLngLike, maxMargin?: number): boolean;
        toString(): string;
        distanceTo(otherLatLng: LatLngLike): number;
        wrap(): LatLng;
        toBounds(sizeInMeters: number): LatLngBounds;
        clone(): LatLng;
    
        lat: number;
        lng: number;
        alt?: number | undefined;
    }


    type PointTuple = [ number, number ];
    type LatLngTuple = [ number, number ];
    type LatLngLike = LatLng | LatLngTuple;
    /** @deprecated */
    type LatLngExpression = LatLngLike;


    class LatLngBounds {
        constructor();
        constructor( southWest: LatLngLike, northEast: LatLngLike );
        constructor( latlngs: LatLngBounds );
        extend(latlngOrBounds: LatLngLike | LatLngBounds | LatLngBoundsTuple): this;
        pad(bufferRatio: number): LatLngBounds;
        getCenter(): LatLng;
        getSouthWest(): LatLng;
        getNorthEast(): LatLng;
        getNorthWest(): LatLng;
        getSouthEast(): LatLng;
        getWest(): number;
        getSouth(): number;
        getEast(): number;
        getNorth(): number;
        contains(otherBoundsOrLatLng: LatLngBoundsTuple | LatLngLike): boolean;
        intersects(otherBounds: LatLngBoundsTuple): boolean;
        overlaps(otherBounds: LatLngBoundsTuple): boolean;
        toBBoxString(): string;
        equals(otherBounds: LatLngBoundsTuple): boolean;
        isValid(): boolean;
    }


    type LatLngBoundsTuple = [ LatLngTuple, LatLngTuple ];
    type LatLngBoundsLike = LatLngBoundsTuple | LatLngBounds;


    namespace Ark {
        interface PinIconOptions {
            colour: string;
            iconSize: PointTuple;
        }

        class CircleMarker extends LeafletModule.CircleMarker {}
        class IconMarker extends LeafletModule.Marker {}
        class Popup extends LeafletModule.Popup {}
        class InteractionControl extends LeafletModule.Handler {}
        class PinIcon extends LeafletModule.Icon {
            constructor( options: PinIconOptions );
        }

        interface IPopupRenderer {
            shouldKeepAround(): boolean;
            buildButtons(): void;
            build(): void;
            buildTools(): void;
        }
    }


    namespace DomUtil {}


    interface MapOptions {
        
    }

    interface IconOptions {
        iconUrl: string;
        iconSize: PointTuple;
    }

    interface CanvasOptions {
        padding: number;
    }

    interface PopupOptions {}

    interface MarkerOptions {
        icon: Icon;
    }

    interface CircleMarkerOptions {
        radius: number;
        zoomScaleFactor?: number;
        fillColor: string;
        fillOpacity: number;
        color: string;
        weight: number;
    }


    interface ImageOverlayOptions {
        className?: string;
        decoding?: 'auto' | 'sync' | 'async';
        antiAliasing?: number;
    }


    class Class {
        static extend(props: any): {new(...args: any[]): any} & typeof Class;
    }


    class Layer {
        _map?: Map;

        getLatLng(): LatLng;
        addTo(map: Map): this;
        remove(): this;
        bringToBack(): this;
        bindPopup( fn: () => Ark.IPopupRenderer, options: PopupOptions, classOverride: typeof Popup ): this;
        openPopup(): this;
        bindTooltip( text: string ): this;
    }

    type LayerMap = { [key: number]: Layer };

    interface IHasBoundsGetter {
        getBounds(): LatLngBounds;
    }


    class Map {
        constructor(element: HTMLElement, options: MapOptions);

        addLayer(layer: Layer): this;
        removeLayer(layer: Layer): this;
        addHandler(name: string, handlerClass: typeof Handler): this;
        closePopup(): void;
        getZoom(): number;
        setZoom( zoom: number ): this;
        fitBounds( bounds: LatLngBounds ): this;
        setView( center: LatLng, zoom?: number ): this;

        on( types: string, fn: Function, context?: object ): void;
        off( types: string, fn: Function, context?: object ): void;

        _haveLayersMutated: boolean;
        _layers: LayerMap;
        options: MapOptions;
    }

    class Handler {
        enable(): void;
        disable(): void;
        enabled(): boolean;
    }

    class Popup {}

    class Icon {
        constructor( options: IconOptions );
    }

    class Canvas extends Layer {
        constructor( options: CanvasOptions );
    }

    class CircleMarker extends Layer implements DataMaps.IHasRuntimeMarkerState {
        constructor( position: LatLngLike, options: CircleMarkerOptions );

        getBounds(): LatLngBounds;
        setDismissed( value: boolean ): void;

        /* Fields internally used and set by the extension */
        apiInstance: DataMaps.ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }

    class Marker extends Layer implements DataMaps.IHasRuntimeMarkerState {
        constructor( position: LatLngLike, options: MarkerOptions );
        setDismissed( value: boolean ): void;

        /* Fields internally used and set by the extension */
        apiInstance: DataMaps.ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }

    class ImageOverlay extends Layer {
        constructor( url: string, bounds: LatLngBoundsLike, options: ImageOverlayOptions );

        getBounds(): LatLngBounds;
    }
    class Polyline extends Layer {
        getBounds(): LatLngBounds;
    }
    class Rectangle extends Polyline {}
}
