<?php
namespace Ark\DataMaps\Rendering\Utils;

class DataMapColourUtils {
    const BLACK = [ 0, 0, 0 ];
    const WHITE = [ 1, 1, 1 ];

    public static function decode( /*string|array*/ $input ): ?array {
        if ( is_array( $input ) ) {
            return $input;
        }

        $input = ltrim( $input, '#' );
        $len = strlen( $input );
        if ( $len === 3 ) {
            $input = str_split( $input, 1 );
        } else if ( $len === 6 ) {
            $input = str_split( $input, 2 );
        } else {
            return null;
        }

        list($r, $g, $b) = array_map( fn ( $c ) => hexdec( str_pad( $c, 2, $c ) ), $input );
        return [ $r/255, $g/255, $b/255 ];
    }

    private static function fToB( float $value ): int {
        return min( 255, $value * 255 );
    }

    public static function asHex( array $input ): string {
        return sprintf("#%02x%02x%02x", self::fToB( $input[0] ), self::fToB( $input[1] ), self::fToB( $input[2] ) );
    }

    public static function getStrokeColour( array $input ): array {
        $mult = 1.7;
        if ( $input[0] * 0.2126 + $input[1] * 0.7152 + $input[2] * 0.0722 > 0.5 ) {
            $mult = 0.3;
        }
        
        $hsl = self::convertRgbToHsl( $input );
        $hsl[2] *= $mult;
        echo '<br/><br/>';
        var_dump($input);
        var_dump( $hsl );
        var_dump( self::convertHslToRgb( $hsl ) );
        return self::convertHslToRgb( $hsl );
    }

    public static function convertRgbToHsl( $input ) {
        list( $r, $g, $b ) = $input;

        $max = max( $r, $g, $b );
        $min = min( $r, $g, $b );

        $h = 0;
        $s = 0;
        $l = ( $max + $min ) / 2;
        $d = $max - $min;

        if ( $d == 0 ) {
            $h = $s = 0;
        } else {
            $s = $d / ( 1 - abs( 2 * $l - 1 ) );

            switch ( $max ) {
                case $r:
                    $h = 60 * fmod( ( ( $g - $b ) / $d ), 6 );
                    if ( $b > $g ) {
                        $h += 360;
                    }
                    break;

                case $g:
                    $h = 60 * ( ( $b - $r ) / $d + 2 );
                    break;

                case $b:
                    $h = 60 * ( ( $r - $g ) / $d + 4 );
                    break;
            }
        }
    
        return [ $h, $s, $l ];
    }
    
    public static function convertHslToRgb( $input ) {
        list( $h, $s, $l ) = $input;

        $r = 0;
        $g = 0;
        $b = 0;
    
        $c = ( 1 - abs( 2 * $l - 1 ) ) * $s;
        $x = $c * ( 1 - abs( fmod( ( $h / 60 ), 2 ) - 1 ) );
        $m = $l - ( $c / 2 );
    
        if ( $h < 60 ) {
            $r = $c;
            $g = $x;
            $b = 0;
        } else if ( $h < 120 ) {
            $r = $x;
            $g = $c;
            $b = 0;
        } else if ( $h < 180 ) {
            $r = 0;
            $g = $c;
            $b = $x;
        } else if ( $h < 240 ) {
            $r = 0;
            $g = $x;
            $b = $c;
        } else if ( $h < 300 ) {
            $r = $x;
            $g = 0;
            $b = $c;
        } else {
            $r = $c;
            $g = 0;
            $b = $x;
        }
    
        return [ floor( $r + $m ), floor( $g + $m ), floor( $b + $m ) ];
    }
}
