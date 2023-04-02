import { Title, CoordinateReferenceSystem } from "./CoreTypes";
import { MarkerLayer } from "./MarkerLayer";
import { MarkerGroup } from "./MarkerGroup";
import { Marker } from "./Marker";
import { MapBackground } from "./MapBackground";
import { MapSettings } from "./MapSettings";


export type DataMap = {
    /**
     * Indicates whether this is a fragment meant to be included in actual maps.
     *
     * @default false
     */
    '$mixin'?: boolean;

    /**
     * List of mix-ins that must be imported by the parser.
     *
     * @default []
     */
    mixins?: Title[];

    /**
     * Reference coordinate space, which also determines whether the system origin will be top-left or bottom-left.
     *
     * Defaults to `[ [0, 0], [100, 100] ]`, which places the origin point in the top-left corner - swap the points for
     * bottom-left.
     *
     * @default [ [ 0, 0 ], [ 100, 100 ] ]
     */
    crs?: CoordinateReferenceSystem;

    /**
     * Coordinate order that will be used in anonymous (arrays and not named keys) box or location specifications.
     *
     * @default 'yx'
     */
    coordinateOrder?: 'yx' | 'latlon' | 'xy' | 'lonlat';

    /**
     * Behaviour settings.
     */
    settings?: MapSettings;

    /**
     * Marker group definitions.
     */
    groups?: Record<string, MarkerGroup>;

    /**
     * Marker category definitions.
     */
    layers?: Record<string, MarkerLayer>;

    /**
     * A map of layer association strings to lists of markers.
     */
    markers?: Record<string, Marker[]>;

    /**
     * Custom data for gadgets, bots or other scripts.
     */
    custom?: Record<string, any>;
} & (
    {
        /**
         * Title (with or without the File namespace) of the image to be used as the background.
         */
        image: Title;
    } | {
        /**
         * List of background configurations.
         */
        backgrounds: ( ( MapBackground & { name: string; } )[] ) | ( [ MapBackground & { name?: string; } ] );
    }
);
