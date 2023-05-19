import { Title } from "./CoreTypes";


export type Marker = (
    { lat: number; lon: number; } | { x: number; y: number; }
) & Partial< {
    /**
     * Identifier to use for permanent links and collectibles.
     *
     * If unspecified, one is generated automatically based on the group and layers this marker is attached to and its location.
     */
    id: string|number;

    /**
     * Name of this marker to show in its popup. Wikitext is permitted. If not given, defaults to marker group name.
     *
     * However, this property does not always go through the wikitext parser for performance reasons. See `isWikitext` property
     * for more information.
     */
    name: string;

    /**
     * Description of this marker to be shown in its popup. Wikitext is permitted. If an array is given, all elements are joined
     * with new lines.
     *
     * However, this property does not always go through the wikitext parser for performance reasons. See `isWikitext` property
     * for more information.
     */
    description: string[] | string;

    /**
     * If true, forces wikitext parsing of the label and description. If false, prevents them from being parsed.
     *
     * If unspecified (default), the choice is left to the software, which will determine if the two properties likely contain
     * wikitext.
     *
     * This should not be adjusted manually unless detection fails.
     */
    isWikitext?: boolean;

    /**
     * Optional icon override. Only allowed if the group this marker is in is configured to show image icons.
     *
     * @since 0.16.4
     */
    icon: Title;

    /**
     * Optional image file that will be displayed in this marker's popup.
     */
    image: Title;

    /**
     * Optional article title this marker will link to in its popup.
     */
    article: string;

    /**
     * Whether this marker will be included in marker search.
     *
     * @default true
     */
    canSearchFor: boolean;

    /**
     * Keywords that represent this marker in marker search. This should be a list of keywords and their relevancy weights.
     *
     * Unless overridden, this composes of the label and description weighed at 1.5 and 0.75 respectively.
     *
     * @example [ [ "Test", 2 ], [ "marker", 1 ] ]
     */
    searchKeywords: [ string, number ][] | string;
} >;
