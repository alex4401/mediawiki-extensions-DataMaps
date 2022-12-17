declare namespace DataMaps {
    enum ECoordinateOrder {
        YX,
        XY
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
    }

    interface IApiMarkerState {
        label?: string;
        desc?: string;
    }
    type ApiMarkerInstance = [ number, number, IApiMarkerState ];
    type PointTupleRepr = ApiMarkerInstance | LeafletModule.LatLngTuple;

    interface IHasRuntimeMarkerState {
        /* Fields internally used and set by the extension */
        apiInstance: ApiMarkerInstance;
        attachedLayers: string[];
        assignedProperties: { [key: string]: string };
    }
}