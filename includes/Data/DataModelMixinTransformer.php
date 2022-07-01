<?php
namespace Ark\DataMaps\Data;

use stdClass;

class DataModelMixinTransformer {
    public static function mergeTwoObjects( stdClass $target, stdClass $overlay ): stdClass {
        foreach ( get_object_vars( $overlay ) as $name => $value ) {
            if ( !isset( $target->$name ) ) {
                // Missing, copy
                $target->$name = $value;
            } else {
                // Merge
                $target->$name = self::mergeUnknown( $target->$name, $value );
            }
        }
        return $target;
    }

    public static function mergeUnknown( $target, $overlay ) {
        // Check both fields have the same type
        if ( $target !== null && $overlay !== null
            && ( ( is_array( $target ) && is_array( $overlay ) ) || ( $target instanceof stdClass && $overlay instanceof stdClass ) ) ) {
            // Proceed to merge
            if ( is_array( $overlay ) ) {
                return self::mergeTwoObjectArrays( $target, $overlay );
            } else {
                return self::mergeTwoObjects( $target, $overlay );
            }
        }

        // Override
        return $overlay;
    }

    public static function mergeTwoObjectArrays( array $target, array $overlay ) {
        $lenT = count( $target );
        foreach ( $overlay as $key => $value ) {
            if ( is_string( $key ) ) {
                // Key-value pair
                if ( !array_key_exists( $key, $target ) ) {
                    // Missing, copy
                    $target[$key] = $value;
                } else {
                    // Merge
                    $target[$key] = self::mergeUnknown( $target[$key], $value );
                }
            } else {
                // Indexed
                if ( $key >= $lenT ) {
                    // Index out of target bounds, copy
                    $target[$key] = $value;
                } else {
                    // Merge
                    $target[$key] = self::mergeUnknown( $target[$key], $value );
                }
            }
        }
        return $target;
    }
}