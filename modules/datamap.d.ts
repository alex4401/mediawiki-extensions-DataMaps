declare namespace DataMaps {
    enum ECoordinateOrder {
        YX,
        XY
    }

    enum ECoordinateOrigin {
        TopLeft = 1,
        BottomLeft = 2
    }

    namespace Configuration {
        interface MarkerGroup {
            
        }

        interface MarkerLayer {
            
        }

        interface Map {
            crs: LeafletModule.LatLngBoundsTuple;
            flags: number;
            cOrder: ECoordinateOrder;
            layerIds: string[];
            groups: { [key: string]: MarkerGroup };
            layers: { [key: string]: MarkerLayer };
        }

        interface BackgroundOverlay {
            at?: LeafletModule.LatLngBoundsTuple;
            image?: string;
            aa?: boolean;
            path?: LeafletModule.PointTuple[];
            weight?: number;
            color?: string;
            fillColor?: string;
        }
    }

    type RuntimeMarkerProperties = { [key: string]: string };
    interface IApiMarkerState {
        label?: string;
        desc?: string;
        article?: string;
    }
    type ApiMarkerInstance = [ number, number, IApiMarkerState ];
    type PointTupleRepr = ApiMarkerInstance | LeafletModule.LatLngTuple;

    interface IHasRuntimeMarkerState {
        /* Fields internally used and set by the extension */
        apiInstance: ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }

    type MapEventTypes = 'backgroundChange' | 'chunkStreamingDone' | 'linkedEvent' | 'markerVisibilityUpdate'
        | 'legendManager' | 'markerReady' | 'leafletLoaded' | 'markerFilteringPanel' | 'markerDismissChange'
        | 'sendLinkedEvent' | 'legendLoaded' | 'collectiblesPanel' | 'groupDismissChange';

    interface ILinkedEventData {
        type: string;
    }

    interface IGroupDismissChangeLinkedEventData extends ILinkedEventData {
        groupId: string;
        state: boolean;
    }
}