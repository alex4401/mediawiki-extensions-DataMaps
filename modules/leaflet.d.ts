declare namespace LeafletModule {
    class LatLng {
        constructor(latitude: number, longitude: number, altitude?: number);
        equals(otherLatLng: LatLngExpression, maxMargin?: number): boolean;
        toString(): string;
        distanceTo(otherLatLng: LatLngExpression): number;
        wrap(): LatLng;
        toBounds(sizeInMeters: number): LatLngBounds;
        clone(): LatLng;
    
        lat: number;
        lng: number;
        alt?: number | undefined;
    }


    type PointTuple = [ number, number ];
    type LatLngTuple = [ number, number ];
    type LatLngExpression = LatLng | LatLngTuple;


    class LatLngBounds {
        constructor(southWest: LatLngExpression, northEast: LatLngExpression);
        constructor(latlngs: LatLngBounds);
        extend(latlngOrBounds: LatLngExpression | LatLngBoundsTuple): this;
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
        contains(otherBoundsOrLatLng: LatLngBoundsTuple | LatLngExpression): boolean;
        intersects(otherBounds: LatLngBoundsTuple): boolean;
        overlaps(otherBounds: LatLngBoundsTuple): boolean;
        toBBoxString(): string;
        equals(otherBounds: LatLngBoundsTuple): boolean;
        isValid(): boolean;
    }


    type LatLngBoundsTuple = [ LatLngTuple, LatLngTuple ];


    namespace Ark {
        class CircleMarker extends LeafletModule.CircleMarker {}
        class IconMarker extends LeafletModule.Marker {}
        class Popup extends LeafletModule.Popup {}
        class InteractionControl extends LeafletModule.Handler {}

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

    interface CanvasOptions {
        padding: number;
    }

    interface PopupOptions {}


    class Class {
        static extend(props: any): {new(...args: any[]): any} & typeof Class;
    }


    class Layer {
        _map?: Map;

        addTo(map: Map): this;
        bindPopup( fn: () => Ark.IPopupRenderer, options: PopupOptions, classOverride: typeof Popup ): this;
    }


    class Map {
        constructor(element: HTMLElement, options: MapOptions);

        addLayer(layer: Layer): this;
        removeLayer(layer: Layer): this;
        addHandler(name: string, handlerClass: typeof Handler): this;

        on( types: string, fn: Function, context?: object ): void;

        _haveLayersMutated: boolean;
    }

    class Handler {
        enable(): void;
        disable(): void;
        enabled(): boolean;
    }

    class Popup {}

    class Canvas extends Layer {
        constructor( options: CanvasOptions );
    }

    class CircleMarker extends Layer implements DataMaps.IHasRuntimeMarkerState {
        /* Fields internally used and set by the extension */
        apiInstance: DataMaps.ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }

    class Marker extends Layer implements DataMaps.IHasRuntimeMarkerState {
        /* Fields internally used and set by the extension */
        apiInstance: DataMaps.ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }
}
