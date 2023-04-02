import { Box, Colour3, Colour4, Point, Title } from "./CoreTypes";


type Overlay = {
    /**
     * Name to show on a tooltip. If unspecified, the tooltip will not be shown.
     */
    name?: string;
};
namespace Overlay {
    export type ImageProps = {
        /**
         * Image file to use.
         */
        image: Title;

        /**
         * Bounds to fit the image in. This is not relative to the owning background.
         */
        at: Box;

        /**
         * Attempts to minimise gaps between multiple closely placed image overlays, but may distort them or cause minor jumping
         * during zoom changes.
         *
         * This is recommended for tile sets.
         *
         * @default false
         */
        reduceGaps?: boolean;
    };


    export type PolylineProps = {
        /**
         * List of points to connect sequentially, defining the line.
         */
        path: Point[];

        /**
         * Line colour.
         */
        color?: Colour4;
    };


    export type BoxProps = {
        /**
         * Bounds of this box.
         */
        at: Box;

        /**
         * Fill colour.
         */
        color?: Colour4;

        /**
         * Border colour.
         */
        borderColor?: Colour3;

        /**
         * Border thickness.
         */
        thickness?: number;
    };
}


type ImageProps = {
    /**
     * Image file to use.
     */
    image: Title;

    /**
     * Bounds to fit the image in.
     */
    at?: Box;
};


type TiledProps = {
    /**
     * Starting position of the tile set.
     *
     * @default [ 0, 0 ]
     */
    at?: Point;

    /**
     * Size of an individual tile.
     */
    tileSize: Box;

    /**
     * List of tiles.
     */
    tiles: {
        /**
         * Position of the tile. 1 unit is one tile as big as the size specified.
         */
        position: Point|number;

        /**
         * Image file to use.
         */
        image: Title;
    }[];
};


export type MapBackground = {
    /**
     * Value for the `bg` property marker category that can be used to tie markers to a specific background.
     */
    associatedLayer?: string;

    /**
     * List of overlays tied to this background.
     *
     * @default []
     */
    overlays?: ( Overlay & ( Overlay.ImageProps | Overlay.PolylineProps | Overlay.BoxProps ) )[];
} & ( ImageProps | TiledProps );
