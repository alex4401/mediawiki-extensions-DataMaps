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
    public const DEFAULT_ORDER = 'yx';
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
        $value = $this->raw->order ?? self::DEFAULT_ORDER;
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
        return $this->raw->topLeft ?? self::DEFAULT_TOP_LEFT;
    }

    public function getBottomRight(): array {
        return $this->raw->bottomRight ?? self::DEFAULT_BOTTOM_RIGHT;
    }

    public function getBox(): array {
        return [
            $this->getTopLeft(),
            $this->getBottomRight()
        ];
    }

    public function getRotation(): float {
        return deg2rad( $this->raw->rotation ?? 0 );
    }

    public function validate( Status $status ) {
        $this->checkField( $status, [
            'name' => 'order',
            'type' => DataModel::TYPE_STRING,
            'values' => [ 'yx', 'xy', 'latlon', 'lonlat' ]
        ] );
        $this->checkField( $status, [
            'name' => 'topLeft',
            'type' => DataModel::TYPE_VECTOR2
        ] );
        $this->checkField( $status, [
            'name' => 'bottomRight',
            'type' => DataModel::TYPE_VECTOR2
        ] );
        $this->checkField( $status, [
            'name' => 'rotation',
            'type' => DataModel::TYPE_NUMBER
        ] );
    }
}
