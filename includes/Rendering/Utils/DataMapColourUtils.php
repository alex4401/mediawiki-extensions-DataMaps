<?php
namespace Ark\DataMaps\Rendering\Utils;

class DataMapColourUtils {
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

        list( $r, $g, $b ) = array_map( fn ( $c ) => hexdec( str_pad( $c, 2, $c ) ), $input );
        return [ $r, $g, $b ];
    }

    public static function asHex( array $input ): string {
        return sprintf( '#%02x%02x%02x', $input[0], $input[1], $input[2] );
    }
}
