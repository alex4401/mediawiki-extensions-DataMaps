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
    '$mixin'?: boolean;

    /**
     * List of mix-ins that must be imported by the parser.
     *
     * @default []
     */
    mixins?: Title[];

    /**
     * Reference coordinate space, which also determines whether the system origin will be top-left or bottom-left. This
     * is deduced from the corner coordinates.
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
        image: Title;
    } | {
        /**
         * List of background configurations.
         */
        backgrounds: ( ( MapBackground & { name: string; } )[] ) | ( [ MapBackground & { name?: string; } ] );
    }
);
