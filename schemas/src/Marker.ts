import { Title } from "./CoreTypes";


class MarkerBase {
    id?: string|number = undefined;
    name?: string;
    description?: string[] | string;
    isWikitext?: boolean;
    article?: string;
    image?: Title;
    canSearchFor: boolean = true;
    searchKeywords?: [ number, string ][] | string;
}


export type Marker = MarkerBase & ( { lat: number; lon: number; } | { x: number; y: number; } );
