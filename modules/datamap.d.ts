declare namespace DataMaps {
    enum CoordinateOrder {
        YX,
        XY
    }

    enum CoordinateOrigin {
        TopLeft = 1,
        BottomLeft = 2
    }

    /** @deprecated */
    type ECoordinateOrder = CoordinateOrder;
    /** @deprecated */
    type ECoordinateOrigin = CoordinateOrigin;

    namespace Configuration {
        interface BaseMarkerGroup {
            name: string;
            flags?: number;
            legendIcon?: string;
            article?: string;
        }

        interface IconMarkerGroup extends BaseMarkerGroup {
            size: LeafletModule.PointTuple;
            markerIcon: string;
        }

        interface PinMarkerGroup extends BaseMarkerGroup {
            size: LeafletModule.PointTuple;
            pinColor: string;
        }

        interface CircleMarkerGroup extends BaseMarkerGroup {
            size: number;
            fillColor: string;
            strokeColor?: string;
            strokeWidth?: number;
            extraMinZoomSize?: number;
        }

        type MarkerGroup = IconMarkerGroup|PinMarkerGroup|CircleMarkerGroup;
        type IconBasedMarkerGroup = IconMarkerGroup|PinMarkerGroup;

        interface MarkerLayer {
            name?: string;
            discrim?: string;
            markerIcon?: string;
        }

        interface BackgroundOverlay {
            name?: string;
            at: LeafletModule.LatLngBoundsTuple;
            image?: string;
            aa?: boolean;
            path?: LeafletModule.PointTuple[];
            weight?: number;
            color?: string;
            fillColor?: string;
        }

        interface Background {
            name?: string;
            image?: string;
            at: LeafletModule.LatLngBoundsTuple;
            layer: string;
            overlays?: BackgroundOverlay[];
            // Runtime
            layers: LeafletModule.Layer[];
        }
        
        interface Map {
            version: number;
            cOrder: CoordinateOrder;
            crs: LeafletModule.LatLngBoundsTuple;
            flags: number;
            backgrounds: Background[];
            layerIds: string[];
            groups: { [key: string]: MarkerGroup };
            layers: { [key: string]: MarkerLayer };
        }
    }

    type RuntimeMarkerProperties = { [key: string]: string };
    interface IApiMarkerState {
        uid?: string;
        label?: string;
        desc?: string;
        article?: string;
        image?: [ string, number, number ];
    }
    type ApiMarkerInstance = [ number, number, IApiMarkerState ];
    type UncheckedApiMarkerInstance = [ number, number, IApiMarkerState|null ];
    type PointTupleRepr = ApiMarkerInstance | LeafletModule.LatLngTuple;

    interface IHasRuntimeMarkerState {
        /* Fields internally used and set by the extension */
        apiInstance: ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }

    type MapEventTypes = 'backgroundChange' | 'chunkStreamingDone' | 'linkedEvent' | 'markerVisibilityUpdate'
        | 'legendManager' | 'markerReady' | 'leafletLoaded' | 'markerFilteringPanel' | 'markerDismissChange'
        | 'sendLinkedEvent' | 'legendLoaded' | 'collectiblesPanel' | 'groupDismissChange' | 'chunkStreamed';

    interface ILinkedEventData {
        type: string;
    }

    interface IGroupDismissChangeLinkedEventData extends ILinkedEventData {
        groupId: string;
        state: boolean;
    }
}