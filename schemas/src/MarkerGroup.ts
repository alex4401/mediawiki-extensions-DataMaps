import { Colour3, Point, Title } from "./CoreTypes";


namespace MarkerGroup {
    class Base {
        name: string;
        article?: string;
        isDefault: boolean = true;
        isCollectible: boolean | 'individual' | 'group' | 'globalGroup' = false;
        autoNumberInChecklist: boolean = false;
        canSearchFor: boolean = true;
    }

    export class Circle extends Base {
        fillColor: Colour3;
        borderColor?: Colour3;
        borderWidth?: number;
        size: number;
        extraMinZoomSize?: number;
        icon?: Title;
    }
    
    
    export class Pin extends Base {
        pinColor: Colour3;
        size: number = 32;
    }
    
    
    export class Icon extends Base {
        icon: Title;
        size: number | Point = [ 32, 32 ];
    }
}


export type MarkerGroup = MarkerGroup.Circle | MarkerGroup.Icon | MarkerGroup.Pin;
