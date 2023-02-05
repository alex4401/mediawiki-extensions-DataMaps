/**
 * @pattern [A-Za-z0-9_-]+
 */
export type Title = string;
export type Point = [ number, number ];
export type Box = [ Point, Point ];
export type CoordinateReferenceSystem = [ Point, Point ];
/**
 * @pattern #([a-z]{3}|[a-z]{6})
 */
type HexColour3 = string;
type RGBColour3 = [ number, number, number ];
/**
 * @pattern #([a-z]{4}|[a-z]{8})
 */
type HexColour4 = string;
type RGBAColour4 = [ number, number, number, number ];
export type Colour3 = HexColour3 | RGBColour3;
export type Colour4 = Colour3 | HexColour4 | RGBAColour4;
