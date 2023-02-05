import { Title, CoordinateReferenceSystem } from "./CoreTypes";
import { MarkerLayer } from "./MarkerLayer";
import { MarkerGroup } from "./MarkerGroup";
import { Marker } from "./Marker";
import { MapBackground } from "./MapBackground";
import { MapSettings } from "./MapSettings";


class DataMapBase {
    /**
     * Indicates whether this is a fragment meant to be included in actual maps.
     */
    '$mixin': boolean = false;
    
    /**
     * List of mix-ins that must be imported by the parser.
     */
    mixins: Title[] = [];

    /**
     * Reference coordinate space, which also determines whether the system origin will be top-left or bottom-left.
     *
     * Defaults to `[ [0, 0], [100, 100] ]`, which places the origin point in the top-left corner - swap the points for
     * bottom-left.
     */
    crs: CoordinateReferenceSystem = [ [ 0, 0 ], [ 100, 100 ] ];

    /**
     * 
     */
    coordinateOrder: 'yx' | 'latlon' | 'xy' | 'lonlat' = 'yx';
    
    settings: MapSettings = new MapSettings();
    groups: { [key: string]: MarkerGroup };
    layers: { [key: string]: MarkerLayer };
    markers: { [key: string]: Marker[] };
    custom?: Record<string, any> = undefined;
}


export type DataMap = DataMapBase & ( {
    /**
     * Title (with or without the File namespace) of the image to be used as the background.
     */
    image: Title;
} | {
    /**
     * List of background configurations.
     */
    backgrounds: ( ( MapBackground & { name: string; } )[] ) | ( [ MapBackground & { name?: string; } ] );
} );
