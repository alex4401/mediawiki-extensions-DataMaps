import { Title } from "./CoreTypes";


export type MarkerLayer = Partial< {
    /**
     * User-friendly name. Currently unused.
     */
    name: string;

    /**
     * Text to display in the location row of markers' popups.
     */
    subtleText: string;

    /**
     * Icon file to override makrer icons with. Does not affect pins or circles.
     */
    overrideIcon: Title;
} >;
