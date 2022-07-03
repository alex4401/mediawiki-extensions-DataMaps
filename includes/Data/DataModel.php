<?php
namespace Ark\DataMaps\Data;

use Status;
use stdClass;
use Ark\DataMaps\Rendering\Utils\DataMapFileUtils;
use Ark\DataMaps\Rendering\Utils\DataMapColourUtils;

class DataModel {
    protected static string $publicName = '???';

    const TYPE_ANY = 0;
    const TYPE_ARRAY = 1;
    const TYPE_STRING = 2;
    const TYPE_BOOL = 3;
    const TYPE_NUMBER = 4;
    const TYPE_OBJECT = 5;
    const TYPE_VECTOR2 = 11;
    const TYPE_DIMENSIONS = 12;
    const TYPE_VECTOR2x2 = 13;
    const TYPE_BOUNDS = self::TYPE_VECTOR2x2;
    const TYPE_COLOUR = 14;

    protected stdClass $raw;
    private array $validationCheckedFields = [];
    protected bool $validationAreRequiredFieldsPresent = true;

    public function __construct( /*array|stdClass*/ $raw ) {
        if ( is_array( $raw ) ) {
            $raw = (object) $raw;
        }
        $this->raw = $raw;
    }

    private function verifyType( $var, int $typeId ): bool {
        switch ( $typeId ) {
            case self::TYPE_ARRAY:
                // A[ ... ]
                return is_array( $var );
            case self::TYPE_STRING:
                // S""
                return is_string( $var );
            case self::TYPE_BOOL:
                // B
                return is_bool( $var );
            case self::TYPE_NUMBER:
                // N
                return is_numeric( $var );
            case self::TYPE_OBJECT:
                // O{ ... }
                return $var instanceof stdClass;
            case self::TYPE_VECTOR2:
                // [ Na, Nb ]
                return is_array( $var ) && count( $var ) == 2 && is_numeric( $var[0] ) && is_numeric( $var[1] );
            case self::TYPE_DIMENSIONS:
                // Nab || [ Na, Nb ]
                return is_numeric( $var ) || $this->verifyType( $var, self::TYPE_VECTOR2 );
            case self::TYPE_VECTOR2x2:
                // [ [ Na, Nb ], [ Nc, Nd ] ]
                return is_array( $var ) && count( $var ) == 2
                    && $this->verifyType( $var[0], self::TYPE_VECTOR2 ) && $this->verifyType( $var[1], self::TYPE_VECTOR2 );
            case self::TYPE_COLOUR:
                // S"#rrggbb" || S"#rgb" || [ Nr, Ng, Nb ]
                return DataMapColourUtils::decode( $var ) !== null;
        }
        throw new InvalidArgumentException( wfMessage( 'datamap-error-internal-unknown-field-type', $typeId ) );
    }

    protected function allowOnly( Status $status, array $fields ) {
        $unexpected = array_diff( array_keys( get_object_vars( $this->raw ) ), $fields );
        if ( !empty( $unexpected ) ) {
            $status->fatal( 'datamap-error-validate-unexpected-fields', static::$publicName, implode( ', ', $unexpected ) );
        }
    }

    protected function trackField( string $name ) {
        $this->validationCheckedFields[] = $name;
    }

    protected function disallowOtherFields( Status $status ) {
        $this->allowOnly( $status, $this->validationCheckedFields );
    }

    protected function requireField( Status $status, string $name, int $typeId ): bool {
        $this->trackField( $name );
        if ( !isset( $this->raw->$name ) ) {
            $this->validationAreRequiredFieldsPresent = false;
            $status->fatal( 'datamap-error-validate-field-required', static::$publicName, $name,
                wfMessage( 'datamap-error-validate-check-docs' ) );
            return false;
        } elseif ( $typeId !== self::TYPE_ANY && !$this->verifyType( $this->raw->$name, $typeId ) ) {
            $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, $name,
                wfMessage( 'datamap-error-validate-check-docs' ) );
            return false;
        }
        return true;
    }

    protected function requireEitherField( Status $status, string $nameA, int $typeIdA, string $nameB, int $typeIdB ): bool {
        $this->trackField( $nameA );
        $this->trackField( $nameB );
        $existsA = isset( $this->raw->$nameA );
        $existsB = isset( $this->raw->$nameB );
        if ( !$existsA && !$existsB ) {
            $status->fatal( 'datamap-error-validate-field-required-either', static::$publicName, $nameA, $nameB );
        } elseif ( $existsA && $existsB ) {
            $status->fatal( 'datamap-error-validate-exclusive-fields', static::$publicName, $nameA, $nameB );
        } else {
            return $this->requireField( $status, $existsA ? $nameA : $nameB, $existsA ? $typeIdA : $typeIdB );
        }
    }

    protected function expectField( Status $status, string $name, int $typeId ): bool {
        $this->trackField( $name );
        if ( isset( $this->raw->$name ) && !$this->verifyType( $this->raw->$name, $typeId ) ) {
            $status->fatal( 'datamap-error-validate-wrong-field-type', $name, static::$publicName );
            return false;
        }
        return true;
    }

    protected function expectEitherField( Status $status, string $nameA, int $typeIdA, string $nameB, int $typeIdB ): bool {
        $this->trackField( $nameA );
        $this->trackField( $nameB );
        $existsA = isset( $this->raw->$nameA );
        $existsB = isset( $this->raw->$nameB );
        if ( $existsA && $existsB ) {
            $status->fatal( 'datamap-error-validate-exclusive-fields', static::$publicName, $nameA, $nameB );
        } else {
            return $this->expectField( $status, $existsA ? $nameA : $nameB, $existsA ? $typeIdA : $typeIdB );
        }
    }

    protected function allowReplacedField( Status $status, string $nameOld, int $typeId, string $nameNew, string $since,
        string $until ) {
        if ( isset( $this->raw->$nameOld ) ) {
            $status->warning( 'datamap-error-validate-replaced-field', static::$publicName, $nameOld, $nameNew, $since, $until );
            $this->expectField( $status, $nameOld, $typeId );
        }
    }

    protected function requireFile( Status $status, ?string $name ): bool {
        if ( $name !== null ) {
            if ( empty( $name ) ) {
                $status->fatal( 'datamap-error-validate-field-no-value', static::$publicName, $name );
                return false;
            }

            $file = DataMapFileUtils::getFile( $name );
            if ( !$file || !$file->exists() ) {
                $status->fatal( 'datamap-error-validate-no-file', trim( $name ) );
                return false;
            }
        }
        return true;
    }

    public function validate( Status $status ) { }
}