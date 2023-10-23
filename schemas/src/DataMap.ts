import { Title, CoordinateReferenceSystem, Box, Point } from "./CoreTypes";
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
    '$fragment'?: boolean;

    /**
     * List of mix-ins that must be imported by the parser.
     *
     * @default []
     */
    include?: Title[];

    /**
     * Reference coordinate space. This also determines the origin point from which the system expands.
     *
     * In most situations, this should be set to your preferred coordinate range.
     *
     * If the top-left corner is placed "deeper" into the system than the bottom-right corner, the bottom-right corner
     * will be used as the origin point, i.e. objects will spread from it. For example, this will be achieved by a
     * top-left corner of [100, 100] and bottom-right of [0, 0].
     *
     * @default [ [ 0, 0 ], [ 100, 100 ] ]
     */
    crs?: Box | {
        /**
         * Coordinate order that the data uses.
         *
         * @default 'yx'
         */
        order?: 'yx' | 'latlon' | 'xy' | 'lonlat';

        /**
         * Coordinates of the top-left corner of the map.
         *
         * @default [0,0]
         */
        topLeft?: Point;

        /**
         * Coordinates of the bottom-right corner of the map.
         *
         * @default [100,100]
         */
        bottomRight?: Point;

        /**
         * Rotation angle.
         */
        rotation?: number;
    };

    /**
     * Coordinate order that will be used in anonymous (arrays and not named keys) box or location specifications.
     *
     * @deprecated since 0.16.11, to be removed in 0.17.0; use crs.order.
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
     * Optional text to be shown at the bottom of the filters panel.
     *
     * @since 0.16.5
     */
    disclaimer?: string;

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
        background: Title | MapBackground;
    } | {
        /**
         * List of background configurations.
         */
        backgrounds: ( ( MapBackground & { name: string; } )[] ) | ( [ MapBackground & { name?: string; } ] );
    }
);
