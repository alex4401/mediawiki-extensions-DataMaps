import { Box, Colour3, Colour4, Point, Title } from "./CoreTypes";


namespace MapBackground {
    export class OverlayBase {
        name?: string;
    }


    export class ImageOverlay extends OverlayBase {
        image: Title;
        at: Box;
        reduceGaps: boolean = false;
    }


    export class PolylineOverlay extends OverlayBase {
        path: Point[];
        color?: Colour4;
        borderColor?: Colour3;
    }


    export class BoxOverlay extends OverlayBase {
        at: Box;
        color?: Colour4;
        thickness?: number;
    }

    class Base {
        overlays: ( ImageOverlay|PolylineOverlay|BoxOverlay )[];
        associatedLayer?: string;
    }


    export class Image extends Base {
        image: Title;
        at?: Box;
        associatedLayer?: string;
    }


    export class Tiled extends Base {
        at: Point = [ 0, 0 ];
        tileSize: Box;
        tiles: {
            position: Point|number;
            image: Title;
        }[];
    }
}


export type MapBackground = ( MapBackground.Image|MapBackground.Tiled );
