<?php
namespace MediaWiki\Extension\DataMaps\Data;

use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;
use stdClass;

class CoordinateSystem extends DataModel {
    protected static string $publicName = 'CoordinateSystem';

    public const DEFAULT_TOP_LEFT = [ 0, 0 ];
    public const DEFAULT_BOTTOM_RIGHT = [ 100, 100 ];
    public const DEFAULT_SPACE = [ self::DEFAULT_TOP_LEFT, self::DEFAULT_BOTTOM_RIGHT ];
    public const ORDER_YX = 0;
    public const ORDER_XY = 1;

    public static function normalisePoint( array $value, int $order ): array {
        if ( $order === self::ORDER_XY ) {
            $value = [ $value[1], $value[0] ];
        }
        return $value;
    }

    public static function normaliseBox( array $value, int $order ): array {
        if ( $order === self::ORDER_XY ) {
            $value = [ [ $value[0][1], $value[0][0] ], [ $value[1][1], $value[1][0] ] ];
        }
        return $value;
    }
    
    public function getOrder(): int {
        $value = $this->raw->order ?? 'yx';
        switch ( $value ) {
            case 'yx':
            case 'latlon':
                return self::ORDER_YX;
            case 'xy':
            case 'lonlat':
                return self::ORDER_XY;
        }
    }

    public function getTopLeft(): array {
        return $this->getBox()[0];
    }

    public function getBottomRight(): array {
        return $this->getBox()[1];
    }

    /**
     * If coordinate space spec is oriented [ lower lower upper upper ], assume top left corner as origin point (latitude will
     * be flipped). If [ upper upper lower lower ], assume bottom left corner (latitude will be unchanged). Any other layout is
     * invalid.
     */
    public function getBox(): array {
        return $this->raw->crs ?? self::DEFAULT_SPACE;
    }

    public function validate( Status $status ) {
        $this->checkField( $status, [
            'name' => 'order',
            'type' => DataModel::TYPE_STRING,
            'values' => [ 'yx', 'xy', 'latlon', 'lonlat' ]
        ] );
        $this->checkField( $status, [
            'name' => 'crs',
            'type' => DataModel::TYPE_VECTOR2X2,
            'check' => static function ( $status, $crs ) {
                // Validate the coordinate system - only two supported schemes are [ lower lower higher higher ] (top-left), and
                // [ higher higher lower lower ] (bottom-left).
                $first = $crs[0];
                $second = $crs[1];
                if ( !( ( $first[0] < $second[0] && $first[1] < $second[1] ) || ( $first[0] > $second[0]
                    && $first[1] > $second[1] ) ) ) {
                    $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, 'crs',
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                    return false;
                }
                return true;
            }
        ] );
    }
}
